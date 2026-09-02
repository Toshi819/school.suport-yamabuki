import { auth, db } from "./js/firebase.js";
 
import {
 
signInWithEmailAndPassword,
GoogleAuthProvider,
signInWithPopup
 
}
from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
 
import {
 
collection,
query,
where,
getDocs,
doc,
getDoc
 
}
from
"https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
 
const loginForm =
document.getElementById("loginForm");
 
const googleBtn =
document.getElementById("googleLogin");
 
const message =
document.getElementById("message");
 

 
loginForm.addEventListener(
"submit",
async(e)=>{
 
e.preventDefault();
 
message.textContent = "";
 
try{
 
    const userId =
    document
    .getElementById("userId")
    .value
    .trim();
 
    const password =
    document
    .getElementById("password")
    .value;
 
    const q =
    query(
        collection(db,"users"),
        where("userId","==",userId)
    );
 
    const snapshot =
    await getDocs(q);
 
    if(snapshot.empty){
 
        message.textContent =
        "ユーザーが見つかりません";
 
        return;
    }
 
    const userData =
    snapshot.docs[0].data();
 
    await signInWithEmailAndPassword(
        auth,
        userData.email,
        password
    );
 
    if(userData.role === "admin"){
 
        location.href =
        "admin.html";
 
    }
    else{
 
        location.href =
        "home.html";
 
    }
 
}
catch(error){
 
    console.error(error);
 
    message.textContent =
    "ログインに失敗しました";
 
}
 
});
 
/* =====================
   Googleログイン
===================== */
 
googleBtn.addEventListener(
"click",
async()=>{
 
try{
 
    const provider =
    new GoogleAuthProvider();
 
    const result =
    await signInWithPopup(
        auth,
        provider
    );
 
    const user =
    result.user;
 
    const userDoc =
    await getDoc(
        doc(
            db,
            "users",
            user.uid
        )
    );
 
    if(!userDoc.exists()){
 
        message.textContent =
        "このGoogleアカウントは登録されていません";
 
        return;
    }
 
    const userData =
    userDoc.data();
 
    if(userData.role === "admin"){
 
        location.href =
        "admin.html";
 
    }
    else{
 
        location.href =
        "home.html";
 
    }
 
}
catch(error){
 
    console.error(error);
 
    message.textContent =
    "Googleログインに失敗しました";
 
}
 
});
/* =====================
   Googleログイン
===================== */
 
googleBtn.addEventListener(
"click",
async()=>{
 
try{
 
    const provider =
    new GoogleAuthProvider();
 
    const result =
    await signInWithPopup(
        auth,
        provider
    );
 
    const user =
    result.user;
 
    const userDoc =
    await getDoc(
        doc(
            db,
            "users",
            user.uid
        )
    );
 
    if(!userDoc.exists()){
 
        message.textContent =
        "このGoogleアカウントは登録されていません";
 
        return;
    }
 
    const userData =
    userDoc.data();
 
    if(userData.role === "admin"){
 
        location.href =
        "admin.html";
 
    }
    else{
 
        location.href =
        "home.html";
 
    }
 
}
catch(error){
 
    console.error(error);
 
    message.textContent =
    "Googleログインに失敗しました";
 
}
 
});
 