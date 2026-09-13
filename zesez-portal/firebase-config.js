// Zesez Education — Firebase Konfiqurasiyası
//
// Google ilə giriş və Telefon nömrəsi ilə (SMS kod) giriş funksiyalarının
// işləməsi üçün pulsuz bir Firebase layihəsi lazımdır. Addımlar:
//
// 1) https://console.firebase.google.com ünvanına daxil olun və "Add project"
//    ilə yeni layihə yaradın (Pulsuz "Spark" planı tamamilə kifayətdir).
// 2) Layihə yarandıqdan sonra: Project settings (dişli çarx) > "Your apps" >
//    Web tətbiqi (</> ikonu) əlavə edin. Sizə aşağıdakı formada bir obyekt
//    veriləcək — onu olduğu kimi köçürüb aşağıdakı ZESEZ_FIREBASE_CONFIG
//    dəyərini əvəz edin. (Bu açarlar məxfi deyil, brauzerdə görünməsi normaldır)
// 3) Authentication > Sign-in method bölməsində "Google" və "Phone"
//    provayderlərini aktivləşdirin (Enable).
// 4) Authentication > Settings > Authorized domains bölməsinə öz domeninizi
//    əlavə edin (məs: zesezeducation.vercel.app və localhost artıq var).
// 5) Firestore Database yaradın (Build > Firestore Database > Create database,
//    "Production mode") və bu qovluqdakı firestore.rules faylının içindəkiləri
//    Firestore > Rules bölməsinə köçürün.
// 6) Storage yaradın (Build > Storage > Get started) və storage.rules
//    faylının içindəkiləri Storage > Rules bölməsinə köçürün.
//
// Bu addımlar tamamlanana qədər Giriş/Qeydiyyat düymələri xəbərdarlıq
// mesajı göstərəcək — bu, kodun xətası deyil, sadəcə konfiqurasiyanın
// hələ doldurulmadığını bildirir.

window.ZESEZ_FIREBASE_CONFIG = {
  apiKey: "BURAYA_OZUNUZUN_API_ACHARINIZI_YAZIN",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};
