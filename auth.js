import { auth, db } from "./firebase.js";
 
import {
createUserWithEmailAndPassword
}
from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
 
import {
doc,
setDoc
}
from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
 
const registerBtn =
document.getElementById("registerBtn");
 
if(registerBtn){
 
registerBtn.onclick = async()=>{
 
const username =
document.getElementById("username").value;
 
const password =
document.getElementById("password").value;
 
const email =
`${username}@schoolapp.local`;
 
const userCredential =
await createUserWithEmailAndPassword(
auth,
email,
password
);
 
await setDoc(
doc(db,"users",userCredential.user.uid),
{
username,
role:"student",
createdAt:new Date()
}
);
 
alert("登録完了");
 
location.href="index.html";
 
};
 
}
 