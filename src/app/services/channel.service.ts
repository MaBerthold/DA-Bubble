import { Injectable, inject } from '@angular/core';
import { Firestore, arrayUnion, collection, collectionData, doc, getDocs, setDoc } from '@angular/fire/firestore';
import { Message } from '../models/message.interface';
import { Observable } from 'rxjs';
import { addDoc, updateDoc } from 'firebase/firestore';
import { Channel } from '../models/channel.class';
import { update } from 'firebase/database';
import { User } from '../models/user.class';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {

  firestore: Firestore = inject(Firestore);

  constructor(private authService: AuthService) { }

  collectionRef = collection(this.firestore, "channels");
  chatObservable$ = collectionData(this.collectionRef);


  /**
   * create Arrays and JSON's in component where channel is 
   * @param channelname Name given when created
   * @param description description given when created
   * @param userIDs Array of all userID's which are invited to this channel
   * @param users array of JSON's  of the users which are invited to this channel
   * @param creator first and lastname of the creator (currentUser)
   * *  user{
   *    firstname: user.firstname,
   *    lastname: user.lastname,
   *    profilImg: user.profilImg,   * 
   * }
   */
  createChannel(channelname: string, description: string, userIDs: any[], users: any[], creator: string) {

    const docRef = doc(this.collectionRef)

    setDoc(docRef, {
      channelID: docRef.id,
      channelname: channelname,
      channelDescription: description,
      channelUsersID: userIDs,
      channelUsers: users,
      channelCreator: creator
    })
  }

  /**
   * 
   * @param dmID id of the channel where the message is send
   * @param message JSON of MessageData combined in component where message is written
   */
  sendChannelMessage(channelID: string, message: Message) {
    const ref = doc(this.getMessageRef(channelID));

    setDoc(ref, message)
  }


  getMessageRef(channelID: string) {
    return collection(this.firestore, "channels", channelID, "messages");
  }
  

  sendAnswer(channelID: string, messageID: string, answer: any) {

    const ref = doc(this.getAnswerRef(channelID, messageID));
    const newAnswer = ({ ...answer, answerID: ref.id });

    setDoc(ref, newAnswer);
  }

  sendMessage(channelID: string, message: any) {
    
    const ref = doc(this.getMessageRef(channelID));
    console.warn(ref)
    const newMessage = ({ ...message, messageID: ref.id });
    console.warn(newMessage)
    setDoc(ref, newMessage);
  }



  getAnswerRef(channelID: string, messageID: string) {
    return collection(this.firestore, "channels", channelID, "messages", messageID, "answers")
  }

  getUsersRef() {
    return collection(this.firestore, 'users');
  }

  getChannels(): Observable<any[]> {
    return this.chatObservable$;
  }

  async getAllChannels(): Promise<any[]> {
    const querySnapshot = await getDocs(this.collectionRef);
    const channels: any[] = [];
    querySnapshot.forEach((doc) => {
      channels.push(doc.data());
    });
    return channels;
  }

  async addNewChannel(newChannel: {}) {
    await addDoc(this.getChannelRef(), newChannel).catch(
      (err) => { console.error(err) });
  }

  async addChannelUser(user: User) {
    await updateDoc(this.getChannelUsers(), {
      channelUsers: arrayUnion(user)
    });
  }

  getChannelRef() {
    return collection(this.firestore, 'channels');
  }

  getChannelName(channelname: string) {
    return doc(collection(this.firestore, 'channels'), channelname);
  }

  getSingleChannel(channelId: string) {
    return doc(collection(this.firestore, 'channels'), channelId)
  }

  getChannelDescription(channelDescription: string) {
    return doc(collection(this.firestore, 'channels'), channelDescription);
  }

  getChannelCreator(channelCreator: string) {
    return doc(collection(this.firestore, 'channels'), channelCreator);
  }

  getChannelUsers() {
    return doc(collection(this.firestore, 'channels'));
  }

  async getCreatorsName() {
    this.authService.restoreUserData();

    if (this.authService.isUserAnonymous()) {
      return 'Gast';     

    } else {
      const userFirstName = this.authService.getUserFirstName();
    const userLastName = this.authService.getUserLastName();    
    const channelCreator = userFirstName + userLastName;

    return channelCreator
    }
    
  }

}
