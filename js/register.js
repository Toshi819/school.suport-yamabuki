import { auth, db } from "js/firebase.js";
 
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
}
from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
 
import {
    doc,
    setDoc,
    getDoc,
    runTransaction,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
 
const form =
document.getElementById("registerForm");
 
const message =
document.getElementById("message");
 
const googleBtn =
document.getElementById("googleRegister");
 
/* =====================
   連番ID発行
===================== */
 
async function generateUserId(){
 
    const counterRef =
    doc(db,"counters","userCounter");
 
    const nextNumber =
    await runTransaction(
        db,
        async(transaction)=>{
 
            const counterDoc =
            await transaction.get(counterRef);
 
            if(!counterDoc.exists()){
 
                throw new Error(
                    "counterが存在しません"
                );
 
            }
 
            const current =
            counterDoc.data().current;
 
            transaction.update(
                counterRef,
                {
                    current:current+1
                }
            );
 
            return current+1;
 
        }
    );
 
    return `SH-${String(nextNumber)
        .padStart(6,"0")}`;
}
 
/* =====================
   通常登録
===================== */
 
form.addEventListener(
"submit",
async(e)=>{
 
e.preventDefault();
 
message.textContent="";
 
try{
 
    const username =
    document
    .getElementById("username")
    .value
    .trim();
 
    const password =
    document
    .getElementById("password")
    .value;
 
    const password2 =
    document
    .getElementById("password2")
    .value;
 
    if(username.length < 2){
 
        message.textContent =
        "ユーザー名は2文字以上";
 
        return;
    }
 
    if(password.length < 6){
 
        message.textContent =
        "パスワードは6文字以上";
 
        return;
    }
 
    if(password !== password2){
 
        message.textContent =
        "パスワードが一致しません";
 
        return;
    }
 
    const userId =
    await generateUserId();
 
    const email =
    `${userId}@studyhub.local`;
 
    const userCredential =
    await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );
 
    await setDoc(
 
        doc(
            db,
            "users",
            userCredential.user.uid
        ),
 
        {
            uid:
            userCredential.user.uid,
 
            userId,
 
            username,
 
            email,
 
            role:"student",
 
            provider:"password",
 
            createdAt:
            serverTimestamp()
        }
 
    );
 
    alert(
`登録完了！
 
あなたのユーザーID
 
${userId}
 
必ず保存してください。`
    );
 
    location.href =
    "login.html";
 
}
catch(error){
 
    console.error(error);
 
    message.textContent =
    "登録に失敗しました";
 
}
 
});
 
/* =====================
   Google登録
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
 
    const userId =
    await generateUserId();
 
    await setDoc(
 
        doc(
            db,
            "users",
            user.uid
        ),
 
        {
 
            uid:user.uid,
 
            userId,
 
            username:
            user.displayName || "",
 
            email:
            user.email,
 
            role:"student",
 
            provider:"google",
 
            createdAt:
            serverTimestamp()
 
        }
 
    );
 
    alert(
 
`登録完了！
 
あなたのユーザーID
 
${userId}`
 
    );
 
    location.href =
    "home.html";
 
}
catch(error){
 
    console.error(error);
 
    message.textContent =
    "Google登録に失敗しました";
 
}
 
});
