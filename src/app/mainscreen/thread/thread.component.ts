import { Component, inject } from '@angular/core';
import { MainscreenComponent } from '../mainscreen.component';
import { Firestore, arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc } from '@angular/fire/firestore';
import { ChannelService } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditAnswerComponent } from './edit-answer/edit-answer.component';
import { ChannelDataService } from '../../services/channel-data.service';
import { ReactionsService } from '../../services/reactions.service';




@Component({
  selector: 'app-thread',
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {

  /**
   * müssen dann beim Öffnen vom Chat mit übergeben werden
   * hier nehme ich die angelegten Beispielchannel und die Message
   */
  // channelID: string = "DE4cTsdDLnNeJIVHWd8e";
  // messageID: string = 'A5zuzBTY3E5hWoJCaMo9';

  channelID: string = "";
  messageID: string = '';
  
  /**
   * hier alle Variablen, die aus der Antwort gezogen werden(User, Zeit, Message)
   * Name normalerweise currentUser
   */

  activeChannelName: any = '';

  answer: any;
  answertext: string = '';
  isAnswertextEmojiOpen = false;
  answerUserName: string = 'Frederick Beck';
  allAnswers: any[] = [];

  loadedMessage: any = '';

  userFirstName: string = '';
  userLastName: string = '';
  userImg: string = '';
  userNameComplete: string = '';
  // activeUserAnswer: boolean = true;

  reaction: string = "";
  allReactions: any[] = [];

  firestore: Firestore = inject(Firestore);

  constructor(
    private main: MainscreenComponent,
    public channelService: ChannelService,
    private authService: AuthService,
    private datePipe: DatePipe,
    private dialog: MatDialog,
    public channelDataService: ChannelDataService,
    private reactionService: ReactionsService,
  ) {
    this.channelID = this.channelDataService.channelID;
    this.messageID = this.channelService.activeMessageID;
    this.loadMessage();
    this.loadAnswers();
    this.loadCurrentUser();
    this.getChannelName();
  }


  async getChannelName(){
    const chat = this.channelService.getChannelName(this.channelID);
    const channelData = (await getDoc(chat));
    this.activeChannelName = channelData.data()?.['channelname'];
  }


  async loadCurrentUser() {
    this.authService.restoreUserData();

    if (this.authService.isUserAnonymous()) {
      this.userFirstName = 'Gast';
      this.userLastName = '';
      this.userImg = 'guest-profile.png';
    }
    this.userFirstName = this.authService.getUserFirstName();
    this.userLastName = this.authService.getUserLastName();
    this.userImg = this.authService.getUserImg();
    this.userNameComplete = this.userFirstName + this.userLastName;
  }


  async loadMessage() {
    const docRef = await getDoc(this.getAnswerRef(this.channelID, this.messageID));
    this.loadedMessage = docRef.data();
  }


  /**
   * Funktion kürzen aufteilen
   */
  async loadAnswers() {
    const queryAllAnswers = await query(this.getAllAnswersRef(this.channelID, this.messageID));

    const unsub = onSnapshot(queryAllAnswers, (querySnapshot) => {
      this.allAnswers = [];
      querySnapshot.forEach((doc: any) => {
        this.allReactions = [];

        if (doc.data().answerUserName === this.userNameComplete) {
          const newData = doc.data();
          const nd = ({ ...newData, activeUserAnswers: true })
          this.allAnswers.push(nd);
  
        } else {
          const newData = doc.data();
          const nd = ({ ...newData, activeUserAnswers: false })
          this.allAnswers.push(nd);
                
        }
      })
    })
  }


  async getReactions(id: string) {
    this.allReactions = [];
    const ref = await query(collection(this.firestore, "channels", this.channelID, "messages", this.messageID, 'answers', id, "reactions"));
    const unsub = onSnapshot(ref, (qSnap) => {

      qSnap.forEach((d: any) => {
        const reactionData = d.data();

        const answer = this.allAnswers.find((ans) => ans.answerID === id);
        if (answer) {
          answer.react.push(reactionData);
        }
        // updateDoc(doc(collection(this.firestore, "channels", this.channelID, "messages", this.messageID, 'answers', id,),)
      })
    })
  }


  sendAnswer() {
    this.answer = {
      answertext: this.answertext,
      answerUserName: this.userFirstName + this.userLastName,
      userProfileImg: this.userImg,
      answerID: '',
      activeUserAnswers: false,
      isEmojiOpen: false,
      react: [],
      timestamp: this.datePipe.transform(new Date(), 'HH:mm'),
      date: this.datePipe.transform(new Date(), 'yyyy-MM-dd') // zum Vergkleiche für anzeige "Heute" oder z.B. "21.Januar"
    }

    this.answertext = '';
    this.channelService.sendAnswer(this.channelID, this.messageID, this.answer)
  }


  /**
   * 
   * @param channelId  wird beim erstellen der Componente mit übergeben
   */
  // getChannelName(channelId: string) {
  //   //hier dann channel des Threads auslesen
  // }

  getChannelRef() {
    return (this.firestore, "channels")
  }

  getMessageRef(channelId: string) {
    return collection(this.firestore, "channels", channelId, "messages");
  }

  getAnswerRef(channelId: string, messageId: string) {
    return doc(this.firestore, "channels", channelId, "messages", messageId);
  }

  getAllAnswersRef(channelId: string, messageId: string) {
    return collection(this.firestore, "channels", channelId, "messages", messageId, 'answers');
  }

  closeThread() {
    this.main.threadOpen = false;
    
  }


  async editAnswer(id: string) {
    const docRef = doc(this.getAllAnswersRef(this.channelID, this.messageID), id)
    const docSnap = await getDoc(docRef);
    this.answer = docSnap.data();
    this.openEditAnswerDialog(id);
  }

  openEditAnswerDialog(id: string) {
    this.dialog.open(EditAnswerComponent, {
      data: {
        channelid: this.channelID,
        messageid: this.messageID,
        answerid: id
      },
      position: {
        top: '50%',
        right: '20px'
      },
    });
  }


  // Emojis

  toggleEmoji(id: string) {
    this.allAnswers.forEach((answer) => {
      if (answer.answerID === id) {
        answer.isEmojiOpen = !answer.isEmojiOpen;
      } else {
        answer.isEmojiOpen = false;
      }
    });
  }

  toggleEmojiAnswer() {
    this.isAnswertextEmojiOpen = !this.isAnswertextEmojiOpen
  }

  addEmojitoText(event: any) {
    const emoji = event.emoji.native;

    this.answertext = this.answertext + emoji;
    this.toggleEmojiAnswer();
  }


  handleReaction(event: any, answer: any){
    const typ = 'threadReaction';
    this.reactionService.handleReaction(this.channelID, this.messageID, answer.answerID, '', '', event, answer, this.userNameComplete, typ)
  }









  // /**
  //  *  Variablen für BeispielChannel
  //  */

  // channelname: string = 'Entwicklerteam';
  // channelDescription: string = 'Entwicklerteam Chat zum Austauschen von Zeug';
  // channelUsersId: any[]  = [];
  // channelUsers: any[] = [];
  // channelCreator: string = 'Lord Voldemort';

  // /**
  //  * Variablen zum Erstellen einer Message im Channel (simuliert hier Message im Channel auf die geantwortet wird)
  //  */

  // // channelID: string = "DE4cTsdDLnNeJIVHWd8e";
  // senderID: string = 'W23nHK0hmT5yVTETSPL2';
  // senderNamen: string = 'Klemens Naue';
  // // sendTime: Date = ;
  // messageText: string = 'Hey, kannst du mir bitte auf diese Nachricht eine Antwort oder Reaktion senden?';


  // /**
  //  * to create a testchannel make a (click)-function on send-icon
  //  */
  // async createChannel(){

  //   const users = query(collection(this.firestore, "users"));

  //   const querySnap = await getDocs(users);
  //   querySnap.forEach((user: any) => {
  //     this.channelUsersId.push(user.data().id)      //erstelle Array mit Id's der Channelteilnehmer
  //     this.channelUsers.push({                      //erstelle Array mit Namen und ProfilImg von Channelteilnehmern
  //       firstname: user.data().firstname,
  //       lastname: user.data().lastname,
  //       profilImg: user.data().profileImg,
  //     })
  //   });

  //   this.channelService.createChannel(this.channelname, this.channelDescription, this.channelUsersId, this.channelUsers, this.channelCreator)   
  // }


  // createMessage(){

  //   const messageRef = doc(this.getMessageRef(this.channelID));

  //   setDoc(messageRef, {
  //     senderID: this.senderID,
  //     senderNamen: this.senderNamen,
  //     messageText: this.messageText,
  //     messageID: messageRef.id,
  //   });

  // }
}
