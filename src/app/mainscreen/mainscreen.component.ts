import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../models/user.class';
import { Firestore, Unsubscribe, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { collection } from 'firebase/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, getMetadata } from '@angular/fire/storage';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mainscreen',
  templateUrl: './mainscreen.component.html',
  styleUrl: './mainscreen.component.scss'
})
export class MainscreenComponent implements OnInit {
    firestore: Firestore = inject(Firestore);
    user = new User();
    threadOpen: boolean =  true;
    userFirstName: String = '';
    userLastName: String = '';
    userFullName: String = '';
    isProfileMenuOpen: boolean = false;
    isProfileInfoOpen: boolean = false;
    isEditMode: boolean = false;
    editedUserFullName: String = '';
    userID: any;
    userList;
    private unsubscribeSnapshot: Unsubscribe | undefined;
    userIsOnline: boolean = false;
    isChangeImagePopupOpen: boolean = false;
    isChooseAvatarOpen: boolean = false;
    selectedAvatarNr!: number | string | null;

   /*  @Output() emojiSelectedEvent = new EventEmitter<string>(); */

    constructor(public authService: AuthService, private router: Router, private route: ActivatedRoute, private storage: Storage, private snackBar: MatSnackBar) {
            this.userID = this.route.snapshot.paramMap.get('id');
            this.userList = this.getUserfromFirebase();
    }

   /*  emojiSelected(event: any) {
        this.emojiSelectedEvent.emit(event.emoji.native);
      }
 */
    ngOnInit(): void {
        if (this.userID) {
            this.checkIsGuestLogin();
        }
    }

    getProfileImagePath(): string {
        if (this.selectedAvatarNr !== null && this.selectedAvatarNr !== undefined) {
            if (typeof this.selectedAvatarNr === 'string' && this.selectedAvatarNr.startsWith('https')) {
                return this.selectedAvatarNr;
            } else {
                return `./assets/img/avatar${this.selectedAvatarNr}.png`;
            }
        } else if (this.user.profileImg.startsWith('https://firebasestorage.googleapis.com')) {
            return this.user.profileImg;
        } else {
            return `./assets/img/${this.user.profileImg}`;
        }
    }

    ngOnDestroy(){
        if (this.unsubscribeSnapshot) {
            this.unsubscribeSnapshot();
        }
    }

    getUserID() {
        return doc(collection(this.firestore, 'users'), this.userID);
    }

    async getUserfromFirebase(): Promise<void> {
        try {
          const userDocRef = doc(this.firestore, 'users', this.userID);
          const userDocSnap = await getDoc(userDocRef);
    
          if (userDocSnap.exists()) {
            this.user = new User(userDocSnap.data());
            this.user.id = this.userID;
            this.userFullName = `${this.user.firstname} ${this.user.lastname}`;
            this.userIsOnline = await this.authService.getOnlineStatus(this.userID);
          }
        } catch (error) {}
    }
    
    checkIsGuestLogin(): void {
        getDoc(this.getUserID()).then((docSnapshot) => {
            if (docSnapshot.exists()) {
                this.getUserfromFirebase();
            } else {
                this.userFullName = 'Gast';
                this.user.profileImg = 'guest-profile.png';
                this.user.email = 'E-Mail-Adresse nicht vorhanden.'
            }
        });
    }

    logout(userId: string) {
        this.authService.logout(userId);
        this.router.navigate(['/']); 
    }

    toggleProfileMenu() {
        this.isProfileMenuOpen = !this.isProfileMenuOpen;
    }

    openUserInfo() {
        this.isProfileInfoOpen = true;
        this.isEditMode = false;
    }

    closeUserInfo() {
        this.isProfileInfoOpen = false;
        this.isProfileInfoOpen = false;
    }

    openEditUser() {
        this.editedUserFullName = this.userFullName;
        this.isEditMode = true;
        this.isProfileInfoOpen = false;
    }

    closeEditUser() {
        this.isEditMode = false;
        this.isProfileInfoOpen = false;
    }

    async saveUserChange() {
        let [firstName, lastName] = this.userFullName.split(' ');
        this.user.firstname = firstName;
        this.user.lastname = lastName;

        if (this.selectedAvatarNr !== null && this.selectedAvatarNr !== undefined) {
            if (typeof this.selectedAvatarNr === 'string' && this.selectedAvatarNr.startsWith('https')) {
                this.user.profileImg = this.selectedAvatarNr;
            } else {
                this.user.profileImg = `avatar${this.selectedAvatarNr}.png`;
            }
        }
    
        try {
            let updatedData = { ...this.user.toUserJson()};
            await updateDoc(this.getUserID(), updatedData);
            await this.changeEmailInAuth(this.user.email);
            this.authService.setUserData(updatedData);
            this.updateUserNameInLocalStorage();
            this.closeEditUser();
            this.closeUserInfo();
            this.isProfileMenuOpen = false;
        } catch (error) {}
    }

    updateUserNameInLocalStorage() {
          localStorage.setItem('userFirstName', this.user.firstname);
          localStorage.setItem('userLastName', this.user.lastname);
    }

    async changeEmailInAuth(newEmail: any) {
        try {
          this.authService.updateAndVerifyEmail(newEmail);
        } catch (error) {}
    }

    toggleChangeImagePopup() {
        this.isChangeImagePopupOpen = !this.isChangeImagePopupOpen;
    }

    openAvatar() {
        this.isChooseAvatarOpen = true;
        this.isChangeImagePopupOpen = false;
    }

    closeAvatar() {
        this.isChooseAvatarOpen = false;
    }

    selectAvatar(avatarNr: number) {
        this.selectedAvatarNr = avatarNr;
        this.isChooseAvatarOpen = false;
    }

    async uploadFiles(event: any) {
        this.isChangeImagePopupOpen = false;
        let files = event.target.files;
      
        if (!files || files.length === 0) {
          return;
        }
      
        let file = files[0];
      
        if (!(await this.isValidFile(file))) {
          return;
        }
      
        let timestamp = new Date().getTime();
        let imgRef = ref(this.storage, `images/${timestamp}_${file.name}`);
      
        uploadBytes(imgRef, file).then(async () => {
            let url = await getDownloadURL(imgRef);
            console.log('Image uploaded successfully:', url);

            this.selectedAvatarNr = url;
        
        });
    }

    async isValidFile(file: File): Promise<boolean> {
        if (file.size > 500000) {
          this.showSnackbar('Error: Sorry, your file is too large.');
          return false;
        }
      
        let allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
        if (!allowedFormats.includes(file.type)) {
          this.showSnackbar('Error: Invalid file format. Please upload a JPEG, PNG, GIF, JPG.');
          return false;
        }
      /* 
        let exists = await this.fileAlreadyExists(file.name);
        if (exists) {
          this.showSnackbar('Error: This file already exists.');
          return false;
        } */
      
        return true;
    }

  /*   async fileAlreadyExists(fileName: string): Promise<boolean> {
        let imgRef = ref(this.storage, `images/${fileName}`);
      
        try {
          await getMetadata(imgRef);
          return true;
        } catch (error: any) {
          if (error.code === 'storage/object-not-found') {
            return false;
          } else {
            throw error;
          }
        }
    } */

    showSnackbar(message: string): void {
        this.snackBar.open(message, 'Close', {
          duration: 3000,
        });
    }


}
