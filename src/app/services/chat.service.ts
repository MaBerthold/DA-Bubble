import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  firestore: Firestore = inject(Firestore);
  userID: string = '';
  collectionChatRef = collection(this.firestore, 'chats');
  allUsers: any[] = [];
/*   chatID: string | null = null; */
  

  constructor() { }


  /**
   * 
   * @returns collection of call chats
   */
  getChatsRef(){
    return collection(this.firestore, 'chats')
  }

  getUsersRef(){
    return collection(this.firestore, 'users')
  }

  /**
   * creates new chats
   * @param chatname says all
   * @param chatUsers JSON of both ChatUsers with all UserDatas
   */
  createNewChat(chatname: string, chatUsers: any[]){
    const newChatRef = doc(this.getChatsRef())

    setDoc(newChatRef, {
      chatID: newChatRef.id,
      chatname: chatname,
      chatUsers: chatUsers
    })


  }

  async getAllChats(): Promise<any[]> {
    const querySnapshot = await getDocs(this.collectionChatRef);
    const chats: any[] = [];
    querySnapshot.forEach((doc) => {
      chats.push(doc.data());
    });
    return chats;
  }

  sendMessage(message: any, chatID: string){
    const ref = doc(collection(this.firestore, "chats", chatID, "messages"));
    const newMessage = ({ ...message, messageID: ref.id });
    setDoc(ref, newMessage);
  }


  async createChatsForNewUser(userData: any, userID: string){    

    userData = ({...userData, id: userID});
    const allUsersQuery = query(this.getUsersRef())

    onSnapshot(allUsersQuery, (querySnapshot) => {      
      this.buildUserArray(querySnapshot);
      this.allUsers.forEach((user: any) => {
        this.buildNewChat(user, userData);   
        })      
    });
  }


  buildUserArray(querySnapshot: any){
      querySnapshot.forEach((doc: any) => {
      this.allUsers.push(doc.data())
    });
  }

  buildNewChat(user: any, userData: any){
    let newChat :any[] = [];

    if (user.id == userData.id) {
      newChat.push(userData.id)
    } else {
      newChat.push(user.id, userData.id)
    }

    const chatname = user.firstname + ' & ' + userData.firstname;
    const chatUsers = newChat;
    this.createNewChat(chatname, chatUsers)
    console.warn("new Chat createt", chatname)
  }

  async loadChat(chatID: string): Promise<any> {
      const chatDocRef = doc(this.firestore, 'chats', chatID);
      const chatDocSnapshot = await getDoc(chatDocRef);

      if (chatDocSnapshot.exists()) {
        return chatDocSnapshot.data();
      } else {
        console.error(`Chat mit ID ${chatID} nicht gefunden.`);
        return null;
      }
  }

  async getChatIDForSameUser(user1ID: string, user2ID: string): Promise<string | null> {
      const querySnapshot = await getDocs(
          query(collection(this.firestore, 'chats'), where('chatUsers', '==', [user1ID]))
      );

      for (const doc of querySnapshot.docs) {
          const chatData = doc.data();
          const chatUsers = chatData['chatUsers'];

          if (chatUsers.length === 1 && chatUsers.includes(user1ID)) {
              console.log('Returning ChatID:', chatData['chatID']);
              return chatData['chatID'];
          }
      }
      return null;
  }

  async getChatIDForDifferentUsers(user1ID: string, user2ID: string): Promise<string | null> {
      const querySnapshot = await getDocs(
          query(collection(this.firestore, 'chats'), where('chatUsers', '==', [user1ID, user2ID]))
      );

      for (const doc of querySnapshot.docs) {
          const chatData = doc.data();
          const chatUsers = chatData['chatUsers'];

          if (chatUsers.length === 2 && chatUsers.includes(user1ID) && chatUsers.includes(user2ID)) {
              console.log('Returning ChatID:', chatData['chatID']);
              return chatData['chatID'];
          }
      }
      return null;
  }

}
