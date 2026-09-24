/* Areté — latihan kekuatan.
   Tiga hal di satu modul: pustaka gerakan, utang pola gerak, dan penyusun sesi.

   Kenapa tidak ada template mingguan lagi. Sesi coach berubah tiap minggu,
   kadang prehab penuh setelah lomba, kadang barbell squat berat. Rencana yang
   dibuat di awal minggu akan salah lebih sering daripada benar. Yang dipakai:
   tiap pola menyimpan berapa hari sejak terakhir dapat beban nyata, dan sesi
   hari ini selalu mengambil utang terbesar yang bebannya masih masuk. */
window.TRAIN = (function () {

  /* ============================================================
     SEPULUH POLA WAJIB
     Hip flexor berdiri sendiri, bukan prehab: hip flexion berbeban itu
     pola latihan pelari. Yang prehab cuma aktivasi band.
     Ankle dipisah dari Calf karena yang dilatih beda otot, dan Achilles
     yang jadi pembatas seluruh program.
     ============================================================ */
  const PATS = ['Squat','Hinge','Push','Tarik','Single-leg','Calf','Ankle','Hip flexor','Core','Plyo'];
  const EXTRA = ['Prehab','Mobilitas'];
  const ALLPAT = PATS.concat(EXTRA);
  const BIG = ['Squat','Hinge','Push','Tarik','Single-leg'];
  const TIERF = { berat:1.0, sedang:0.6, ringan:0.25 };
  const TIERS = [['berat','Berat'],['sedang','Sedang'],['ringan','Ringan']];
  const AMBANG = 10;          /* di atas ini pola dianggap bolong */
  const OTOT = ['Gluteus maximus','Gluteus medius','Hamstring','Quadriceps','Adductor','Hip flexor',
    'Gastrocnemius','Soleus','Tibialis anterior','Tibialis posterior','Peroneal','Erector spinae',
    'Rectus abdominis','Transverse abdominis','Oblique','Latissimus dorsi','Rhomboid','Trapezius',
    'Deltoid','Pectoralis major','Biceps','Trisep'];

  /* Inventaris gym EZFIT, disusun dari 12 foto dan dikonfirmasi langsung.
     Yang bisa dikerjakan di rumah ditandai supaya menu harian punya varian. */
  const GEAR = ['Bodyweight','Band','Matras','Rak squat','Barbell','Trap bar','Dumbbell','Bench',
    'Leg press','Leg extension','Leg curl','Hip thrust','Back extension','Chest press','Shoulder press',
    'Dip station','Lat pulldown','Row plate-loaded','Pull-up bar','Cable crossover','Plyo box',
    'Grid ketangkasan','Turf lane','Sled','Kettlebell','Med ball','Wobble board','Stall bar',
    'Swiss ball','Treadmill','Step atau plate','Captain chair'];
  const HOME = ['Bodyweight','Band','Matras'];

  /* ============================================================
     PUSTAKA GERAKAN
     pat  pola utama, pat2 pola kedua kalau satu gerakan mengisi dua
     slot 1 primer, 2 power/plyo, 3 utama, 4 sekunder, 5 isolasi, 6 isometrik
     kind load beban x reps, time detik, cont kontak, box kontak + tinggi, dist meter + beban
     a    alias pencarian, karena nama coach beda dengan nama pustaka
     ============================================================ */
  const EX = {

  /* ---------- SQUAT ---------- */
  bsquat:{n:'Barbell back squat',a:'back squat barbell squat',p:'Quadriceps, Gluteus maximus',s:'Erector spinae',g:'Rak squat',pat:'Squat',slot:3,kind:'load',tier:'berat',def:[[40,8,'W'],[70,6],[70,6],[70,6]],alt:['fsquat','gsquat','legpress'],
    cue:[['Setup','Bar di trapezius, bukan di leher. Kaki selebar pinggul, ujung kaki sedikit keluar.'],['Gerakan','Turun sampai lipat pinggul sejajar lutut. Dada tetap terbuka.'],['Kesalahan','Lutut jatuh ke dalam saat naik. Tekan lantai ke luar dengan telapak kaki.']]},
  fsquat:{n:'Front squat',a:'front squat depan',p:'Quadriceps',s:'Transverse abdominis',g:'Rak squat',pat:'Squat',slot:3,kind:'load',tier:'berat',def:[[30,8,'W'],[50,6],[50,6],[50,6]],alt:['bsquat','gsquat'],
    cue:[['Setup','Bar di depan pundak, siku tinggi, punggung tegak.'],['Gerakan','Turun tegak lurus. Beban lebih ringan dari back squat, itu normal.'],['Kesalahan','Siku jatuh, bar menggulir ke depan. Jaga siku tetap tinggi.']]},
  gsquat:{n:'Goblet squat',a:'goblet squat dumbbell squat',p:'Quadriceps, Gluteus maximus',s:'Adductor',g:'Dumbbell',pat:'Squat',slot:3,kind:'load',tier:'berat',def:[[20,10],[24,10],[24,10]],alt:['bsquat','legpress'],
    cue:[['Setup','Dumbbell di depan dada, siku menempel badan.'],['Gerakan','Turun dalam, lutut membuka ke arah ujung kaki.'],['Kesalahan','Punggung membulat di bawah. Berhenti di kedalaman yang masih bisa tegak.']]},
  legpress:{n:'Leg press 45 derajat',a:'leg press',p:'Quadriceps, Gluteus maximus',s:'Hamstring',g:'Leg press',pat:'Squat',slot:3,kind:'load',tier:'berat',def:[[80,10],[100,10],[100,10]],alt:['bsquat','gsquat'],
    cue:[['Setup','Kaki selebar pinggul di tengah papan, punggung bawah menempel.'],['Gerakan','Turun sampai lutut sekitar 90 derajat, jangan lebih dalam.'],['Kesalahan','Pinggul terangkat dari sandaran. Itu tanda terlalu dalam.']]},
  legext:{n:'Leg extension',a:'leg extension',p:'Quadriceps',s:'',g:'Leg extension',pat:'Squat',slot:5,kind:'load',tier:'sedang',def:[[30,12],[30,12],[30,12]],alt:['revnordic','wallsit'],
    cue:[['Setup','Bantalan di atas pergelangan kaki, bukan di tulang kering.'],['Gerakan','Lurus penuh, tahan satu hitungan di atas.'],['Kesalahan','Mengayun dari pinggul. Kalau harus mengayun, bebannya terlalu berat.']]},
  revnordic:{n:'Reverse nordic',a:'reverse nordic curl kneeling quad',p:'Quadriceps',s:'Hip flexor',g:'Matras',pat:'Squat',slot:5,kind:'load',tier:'sedang',def:[[0,8],[0,8],[0,8]],alt:['legext','wallsit'],
    cue:[['Setup','Berlutut, badan tegak, panggul tetap terbuka.'],['Gerakan','Rebah ke belakang sejauh masih terkendali, lalu tarik kembali dengan quadriceps.'],['Kesalahan','Panggul menekuk supaya terasa ringan. Panggul harus tetap lurus.']],
    note:'Melatih quadriceps secara eksentrik di posisi panjang. Berguna untuk tendon patella dan turunan saat lari.'},

  /* ---------- HINGE ---------- */
  tbdl:{n:'Trap bar deadlift',a:'trap bar deadlift hex bar',p:'Gluteus maximus, Erector spinae',s:'Hamstring, Quadriceps',g:'Trap bar',pat:'Hinge',slot:3,kind:'load',tier:'berat',def:[[40,8,'W'],[82.5,6],[82.5,6],[82.5,6]],alt:['rdl','goodm','bbht'],
    cue:[['Setup','Berdiri di tengah, pegangan di samping. Tulang kering hampir menyentuh bar.'],['Gerakan','Dorong lantai menjauh. Pinggul dan dada naik bersamaan.'],['Kesalahan','Pinggul naik dulu, punggung jadi membulat. Dada naik dulu.']],
    note:'Pilihan hinge terbaik untuk pelari. Beban aksial lebih rendah dari barbell konvensional.'},
  rdl:{n:'Romanian deadlift',a:'rdl romanian deadlift',p:'Hamstring, Gluteus maximus',s:'Erector spinae',g:'Barbell',pat:'Hinge',slot:3,kind:'load',tier:'berat',def:[[40,8,'W'],[70,8],[70,8],[70,8]],alt:['tbdl','goodm','slrdl'],
    cue:[['Setup','Bar menempel paha, lutut sedikit menekuk dan tidak berubah.'],['Gerakan','Dorong pinggul ke belakang, bar mengikuti kaki. Berhenti saat hamstring tertarik penuh.'],['Kesalahan','Menekuk lutut lebih dalam di tengah gerakan. Itu jadi deadlift, bukan RDL.']]},
  slrdl:{n:'Single-leg RDL',a:'single leg rdl satu kaki',p:'Hamstring, Gluteus maximus',s:'Gluteus medius',g:'Dumbbell',pat:'Hinge',pat2:'Single-leg',slot:4,kind:'load',tier:'berat',def:[[16,10],[16,10],[16,10]],alt:['rdl','slbridge'],
    cue:[['Setup','Berat di satu kaki, kaki lain lurus ke belakang seimbang.'],['Gerakan','Pinggul ke belakang, badan dan kaki belakang membentuk satu garis.'],['Kesalahan','Panggul membuka ke samping. Jaga tulang panggul menghadap lantai.']],
    note:'Mengisi dua pola sekaligus, Hinge dan Single-leg.'},
  goodm:{n:'Good morning',a:'good morning',p:'Hamstring, Erector spinae',s:'Gluteus maximus',g:'Rak squat',pat:'Hinge',slot:4,kind:'load',tier:'sedang',def:[[30,10,'W'],[50,10],[50,10]],alt:['rdl','tbdl'],
    cue:[['Setup','Bar di trapezius seperti squat, lutut sedikit menekuk.'],['Gerakan','Pinggul ke belakang sampai badan hampir sejajar lantai.'],['Kesalahan','Beban terlalu berat lalu punggung membulat. Ini gerakan ringan.']]},
  ht:{n:'Hip thrust machine',a:'hip thrust mesin glute bridge',p:'Gluteus maximus',s:'Hamstring',g:'Hip thrust',pat:'Hinge',slot:5,kind:'load',tier:'berat',def:[[75,12],[75,12],[75,12]],alt:['bbht','backext','slbridge'],
    cue:[['Setup','Bantalan di lipat pinggul, tulang belikat menempel sandaran.'],['Gerakan','Dorong sampai badan sejajar, kunci glute satu hitungan.'],['Kesalahan','Punggung bawah yang melengkung, bukan glute yang mengunci. Selipkan panggul.']]},
  bbht:{n:'Barbell hip thrust',a:'barbell hip thrust',p:'Gluteus maximus',s:'Hamstring',g:'Barbell',pat:'Hinge',slot:5,kind:'load',tier:'berat',def:[[70,12],[70,12],[70,12]],alt:['ht','backext'],
    cue:[['Setup','Punggung atas di bench, bar berlapis pad di lipat pinggul.'],['Gerakan','Tekan tumit, dorong pinggul sampai sejajar.'],['Kesalahan','Dagu terangkat. Pandangan ke depan atas menjaga panggul netral.']]},
  backext:{n:'Back extension 45 derajat',a:'back extension hyperextension',p:'Gluteus maximus, Erector spinae',s:'Hamstring',g:'Back extension',pat:'Hinge',slot:5,kind:'load',tier:'sedang',def:[[10,12],[10,12],[10,12]],alt:['ht','bbht'],
    cue:[['Setup','Bantalan tepat di bawah lipat pinggul, bukan di perut.'],['Gerakan','Turun dari pinggul, naik sampai satu garis. Jangan melewati garis.'],['Kesalahan','Naik melengkung berlebihan. Yang dikejar glute, bukan lengkung punggung.']]},
  slbridge:{n:'Hamstring bridge satu kaki',a:'hamstring bridge single leg glute bridge',p:'Hamstring',s:'Gluteus maximus',g:'Matras',pat:'Hinge',slot:5,kind:'load',tier:'sedang',def:[[0,12],[0,12],[0,12]],alt:['ht','nordic'],
    cue:[['Setup','Tumit satu kaki di lantai atau bench, lutut sekitar 20 derajat.'],['Gerakan','Angkat pinggul dengan hamstring, bukan dengan punggung.'],['Kesalahan','Lutut terlalu menekuk, glute yang ambil alih. Kaki lebih lurus membuat hamstring bekerja.']]},
  nordic:{n:'Nordic hamstring curl',a:'nordic nordics hamstring curl eksentrik',p:'Hamstring',s:'Gastrocnemius',g:'Matras',pat:'Hinge',slot:5,kind:'load',tier:'berat',def:[[0,5],[0,5],[0,5]],alt:['slbridge','legcurl'],
    cue:[['Setup','Berlutut, tumit ditahan. Badan lurus dari kepala ke lutut.'],['Gerakan','Turun sepelan mungkin ke depan. Yang dilatih justru penurunannya.'],['Kesalahan','Menekuk pinggul supaya ringan. Panggul harus tetap lurus.']],
    note:'Bukti paling kuat untuk mencegah cedera hamstring pada pelari dan pemain lapangan.'},
  legcurl:{n:'Seated leg curl',a:'leg curl hamstring curl',p:'Hamstring',s:'Gastrocnemius',g:'Leg curl',pat:'Hinge',slot:5,kind:'load',tier:'sedang',def:[[30,12],[30,12],[30,12]],alt:['nordic','slbridge'],
    cue:[['Setup','Bantalan di atas tumit, pinggul rapat di sandaran.'],['Gerakan','Tekuk penuh, tahan, turunkan pelan.'],['Kesalahan','Pinggul terangkat mencari tenaga tambahan.']]},
  kbswing:{n:'Kettlebell swing',a:'kettlebell swing kb swing',p:'Gluteus maximus, Hamstring',s:'Erector spinae',g:'Kettlebell',pat:'Hinge',pat2:'Plyo',slot:2,kind:'load',tier:'sedang',def:[[16,15],[16,15],[16,15]],alt:['tbdl','sled'],
    cue:[['Setup','Kettlebell satu langkah di depan, bahu di atasnya.'],['Gerakan','Lempar ke belakang antara kaki, lalu dorong pinggul keras. Tangan cuma tali.'],['Kesalahan','Mengangkat dengan tangan sampai setinggi dada. Ini gerakan pinggul.']],
    note:'Mengisi Hinge dan Plyo sekaligus. Bebannya cepat tanpa benturan, cocok saat Achilles sedang sensitif.'},

  /* ---------- PUSH ---------- */
  bench:{n:'Bench press',a:'bench press barbell bench',p:'Pectoralis major',s:'Deltoid, Trisep',g:'Bench',pat:'Push',slot:3,kind:'load',tier:'berat',def:[[30,10,'W'],[55,8],[55,8],[55,8]],alt:['chest','dbbench'],
    cue:[['Setup','Tulang belikat ditarik dan diturunkan, kaki menapak penuh.'],['Gerakan','Bar turun ke bawah dada, siku sekitar 45 derajat dari badan.'],['Kesalahan','Siku melebar sejajar bahu. Itu membebani sendi bahu.']]},
  chest:{n:'Chest press plate-loaded',a:'chest press mesin dada',p:'Pectoralis major',s:'Deltoid, Trisep',g:'Chest press',pat:'Push',slot:3,kind:'load',tier:'berat',def:[[45,10],[45,10],[45,10]],alt:['bench','dbbench'],
    cue:[['Setup','Pegangan sejajar bawah dada, punggung menempel.'],['Gerakan','Dorong sampai hampir lurus, jangan mengunci siku keras.'],['Kesalahan','Pundak terangkat ke depan. Jaga tulang belikat tetap di sandaran.']]},
  dbbench:{n:'Dumbbell bench press',a:'dumbbell bench press db bench',p:'Pectoralis major',s:'Deltoid, Trisep',g:'Dumbbell',pat:'Push',slot:3,kind:'load',tier:'berat',def:[[24,10],[24,10],[24,10]],alt:['chest','bench'],
    cue:[['Setup','Dumbbell di atas bawah dada, pergelangan netral.'],['Gerakan','Turun terkendali sampai sejajar dada, dorong dengan lintasan sedikit menyatu.'],['Kesalahan','Turun terlalu dalam sampai bahu tertarik ke depan.']]},
  ohp:{n:'Overhead press',a:'overhead press ohp shoulder press militer',p:'Deltoid',s:'Trisep, Transverse abdominis',g:'Barbell',pat:'Push',slot:4,kind:'load',tier:'berat',def:[[25,8,'W'],[40,8],[40,8],[40,8]],alt:['dbohp','shpress'],
    cue:[['Setup','Bar di depan pundak, siku sedikit di depan bar.'],['Gerakan','Dorong lurus ke atas, kepala sedikit mundur lalu maju di akhir.'],['Kesalahan','Punggung bawah melengkung mengganti tenaga bahu. Kunci perut dan glute.']]},
  dbohp:{n:'Dumbbell shoulder press',a:'dumbbell shoulder press db press',p:'Deltoid',s:'Trisep',g:'Dumbbell',pat:'Push',slot:4,kind:'load',tier:'berat',def:[[18,10],[18,10],[18,10]],alt:['ohp','shpress'],
    cue:[['Setup','Duduk tegak, dumbbell setinggi telinga.'],['Gerakan','Dorong ke atas sedikit menyatu, turun sampai setinggi telinga.'],['Kesalahan','Turun terlalu rendah sampai bahu terjepit.']]},
  shpress:{n:'Shoulder press plate-loaded',a:'shoulder press mesin bahu',p:'Deltoid',s:'Trisep',g:'Shoulder press',pat:'Push',slot:4,kind:'load',tier:'sedang',def:[[35,10],[35,10],[35,10]],alt:['ohp','dbohp'],
    cue:[['Setup','Pegangan setinggi telinga, punggung menempel.'],['Gerakan','Dorong sampai hampir lurus.'],['Kesalahan','Menggunakan hentakan pinggul. Punggung tetap menempel.']]},
  dip:{n:'Dip',a:'dip dips parallel bar',p:'Pectoralis major, Trisep',s:'Deltoid',g:'Dip station',pat:'Push',slot:4,kind:'load',tier:'berat',def:[[0,8],[0,7],[0,6]],alt:['chest','pushup'],
    cue:[['Setup','Pegangan sejajar, badan sedikit condong ke depan.'],['Gerakan','Turun sampai siku 90 derajat, tidak lebih.'],['Kesalahan','Turun sampai bahu di bawah siku. Itu posisi paling rawan untuk bahu.']]},
  pushup:{n:'Push-up',a:'push up pushup',p:'Pectoralis major',s:'Deltoid, Trisep, Transverse abdominis',g:'Bodyweight',pat:'Push',slot:4,kind:'load',tier:'sedang',def:[[0,15],[0,15],[0,15]],alt:['dbbench','dip'],
    cue:[['Setup','Tangan selebar bahu sedikit ke luar, badan satu garis.'],['Gerakan','Turun sampai dada hampir menyentuh, siku 45 derajat.'],['Kesalahan','Pinggul turun lebih dulu. Kunci perut dan glute.']]},

  /* ---------- TARIK ---------- */
  row:{n:'Chest supported row',a:'chest supported row plate row mesin row',p:'Latissimus dorsi, Rhomboid',s:'Biceps, Trapezius',g:'Row plate-loaded',pat:'Tarik',slot:3,kind:'load',tier:'berat',def:[[47.5,10],[47.5,10],[47.5,10]],alt:['dbrow','cablerow','pulldown'],
    cue:[['Setup','Dada menempel bantalan, pegangan sejauh tangan.'],['Gerakan','Tarik siku ke belakang badan, tulang belikat menyatu.'],['Kesalahan','Menarik dengan tangan. Bayangkan siku yang bergerak, bukan tangan.']]},
  dbrow:{n:'One-arm dumbbell row',a:'dumbbell row db row single arm row',p:'Latissimus dorsi',s:'Biceps, Rhomboid',g:'Dumbbell',pat:'Tarik',slot:3,kind:'load',tier:'berat',def:[[26,10],[26,10],[26,10]],alt:['row','cablerow'],
    cue:[['Setup','Satu tangan di bench, punggung sejajar lantai.'],['Gerakan','Tarik ke arah pinggul, bukan ke arah dada.'],['Kesalahan','Badan berputar mengikuti tarikan. Panggul tetap menghadap lantai.']]},
  cablerow:{n:'Seated cable row',a:'cable row seated row',p:'Latissimus dorsi, Rhomboid',s:'Biceps',g:'Cable crossover',pat:'Tarik',slot:4,kind:'load',tier:'sedang',def:[[50,10],[50,10],[50,10]],alt:['row','dbrow'],
    cue:[['Setup','Duduk tegak, lutut sedikit menekuk.'],['Gerakan','Tarik ke perut bawah, dada tetap terbuka.'],['Kesalahan','Mengayun badan ke belakang. Yang bergerak cuma tangan dan tulang belikat.']]},
  pulldown:{n:'Lat pulldown',a:'lat pulldown pulldown',p:'Latissimus dorsi',s:'Biceps, Trapezius',g:'Lat pulldown',pat:'Tarik',slot:4,kind:'load',tier:'berat',def:[[52.5,10],[52.5,10],[52.5,10]],alt:['pullup','row'],
    cue:[['Setup','Pegangan sedikit lebih lebar dari bahu, paha tertahan.'],['Gerakan','Tarik ke atas dada, siku turun ke saku.'],['Kesalahan','Rebah ke belakang berlebihan sampai jadi row.']]},
  pullup:{n:'Pull-up dengan band',a:'pull up pullup chin up',p:'Latissimus dorsi',s:'Biceps, Trapezius',g:'Pull-up bar',pat:'Tarik',slot:3,kind:'load',tier:'berat',def:[[0,8],[0,7],[0,6]],alt:['pulldown','row'],
    cue:[['Setup','Gantung penuh, tulang belikat ditarik turun dulu sebelum menarik.'],['Gerakan','Tarik sampai dagu melewati bar, turun terkendali.'],['Kesalahan','Mulai menarik dari posisi pundak naik. Turunkan pundak dulu.']]},
  facepull:{n:'Face pull',a:'face pull cable face pull',p:'Trapezius, Rhomboid',s:'Deltoid',g:'Cable crossover',pat:'Tarik',slot:5,kind:'load',tier:'sedang',def:[[20,15],[20,15],[20,15]],alt:['cablerow','pulldown'],
    cue:[['Setup','Tali setinggi dahi, kedua tangan menghadap atas.'],['Gerakan','Tarik ke arah dahi, buka siku, putar keluar di akhir.'],['Kesalahan','Menarik ke dada. Ini gerakan setinggi dahi.']]},

  /* ---------- SINGLE-LEG ---------- */
  bss:{n:'Bulgarian split squat',a:'bulgarian split squat bss rear foot elevated',p:'Quadriceps, Gluteus maximus',s:'Adductor, Gluteus medius',g:'Dumbbell',pat:'Single-leg',slot:3,kind:'load',tier:'berat',def:[[20,10],[20,10],[20,10]],alt:['tbsplit','stepup','lunge'],
    cue:[['Setup','Kaki belakang di bench, jarak sekitar satu langkah panjang.'],['Gerakan','Turun tegak, lutut depan ke arah ujung kaki. Berat di kaki depan.'],['Kesalahan','Mendorong dari kaki belakang. Kaki belakang cuma penyeimbang.']],
    note:'Dumbbell mentok 30 kg di gym ini. Sekitar minggu kedelapan pindah ke trap bar, bukan menambah reps tanpa batas.'},
  tbsplit:{n:'Trap bar split squat',a:'trap bar split squat',p:'Quadriceps, Gluteus maximus',s:'Adductor',g:'Trap bar',pat:'Single-leg',slot:3,kind:'load',tier:'berat',def:[[50,8],[50,8],[50,8]],alt:['bss','stepup'],
    cue:[['Setup','Berdiri di tengah trap bar dengan posisi split.'],['Gerakan','Turun tegak sampai lutut belakang hampir menyentuh lantai.'],['Kesalahan','Langkah terlalu pendek, lutut depan maju jauh melewati ujung kaki.']],
    note:'Jalan keluar saat dumbbell 30 kg sudah terlalu ringan.'},
  stepup:{n:'Step-up ke box',a:'step up stepup box step',p:'Gluteus maximus, Quadriceps',s:'Gluteus medius',g:'Plyo box',pat:'Single-leg',slot:4,kind:'load',tier:'berat',def:[[20,10],[20,10],[20,10]],alt:['bss','lunge'],
    cue:[['Setup','Box setinggi lutut, seluruh telapak kaki di atas box.'],['Gerakan','Naik tanpa mendorong dari kaki bawah. Turun pelan.'],['Kesalahan','Menghentak dari kaki bawah. Kalau perlu hentakan, boxnya terlalu tinggi.']]},
  lunge:{n:'Walking lunge di turf',a:'walking lunge lunges',p:'Quadriceps, Gluteus maximus',s:'Hamstring',g:'Turf lane',pat:'Single-leg',slot:4,kind:'dist',tier:'berat',def:[[15,32],[15,32],[15,32]],alt:['bss','stepup'],
    cue:[['Setup','Dumbbell di kedua tangan, badan tegak.'],['Gerakan','Langkah panjang, lutut belakang turun mendekati lantai, dorong dari kaki depan.'],['Kesalahan','Langkah pendek sampai lutut depan maju jauh. Perpanjang langkahnya.']]},
  lungehold:{n:'Lunge hold isometrik',a:'lunges hold isometric lunge split squat hold',p:'Quadriceps, Gluteus maximus',s:'Adductor',g:'Bodyweight',pat:'Single-leg',slot:6,kind:'time',tier:'sedang',def:[[40],[40],[40]],alt:['wallsit','splitiso'],
    cue:[['Setup','Posisi split bawah, lutut belakang menggantung di atas lantai.'],['Gerakan','Tahan tanpa bergerak. Berat di kaki depan, panggul netral.'],['Kesalahan','Bertumpu ke kaki belakang untuk meringankan.']]},

  /* ---------- CALF ---------- */
  slcalf:{n:'Single-leg calf raise',a:'calf raise single leg standing calf',p:'Gastrocnemius medial, Gastrocnemius lateral',s:'Soleus',g:'Step atau plate',pat:'Calf',slot:5,kind:'load',tier:'berat',def:[[20,12],[20,12],[20,10]],alt:['legpresscalf','seatedcalf','calfraise'],
    cue:[['Setup','Ujung kaki di atas plate, tumit menggantung. Lutut LURUS.'],['Gerakan','Naik penuh sampai ujung kaki, turun sampai tumit di bawah plate.'],['Kesalahan','Lutut menekuk. Lutut lurus berarti gastrocnemius, dan itu yang dicari di sini.']],
    note:'Di bobot 70 kg plus dumbbell 30 kg, sekitar 100 kg lewat satu betis. Lebih dari cukup tanpa mesin.'},
  seatedcalf:{n:'Seated calf raise',a:'seated calf raise soleus calf duduk',p:'Soleus',s:'Tibialis posterior',g:'Hip thrust',pat:'Calf',slot:5,kind:'load',tier:'berat',def:[[40,15],[40,15],[40,15]],alt:['ecchd','slcalf'],
    cue:[['Setup','Lutut ditekuk 90 derajat, bantalan pangkuan hip thrust di atas paha, ujung kaki di plate.'],['Gerakan','Naik penuh, tahan sebentar di atas, turun pelan.'],['Kesalahan','Lutut ikut lurus. Lutut DITEKUK berarti soleus, dan soleus yang paling penting untukmu.']],
    note:'Gym ini tidak punya mesin calf raise. Bantalan pangkuan hip thrust adalah penggantinya.'},
  legpresscalf:{n:'Calf press di leg press',a:'calf press leg press calf',p:'Gastrocnemius',s:'Soleus',g:'Leg press',pat:'Calf',slot:5,kind:'load',tier:'berat',def:[[80,15],[80,15],[80,15]],alt:['slcalf','seatedcalf'],
    cue:[['Setup','Ujung kaki di tepi bawah papan, lutut hampir lurus.'],['Gerakan','Dorong dengan ujung kaki, rentang penuh.'],['Kesalahan','Lutut menekuk dan quadriceps yang bekerja.']]},
  calfraise:{n:'Calf raise dua kaki',a:'calf raises heel raise',p:'Gastrocnemius',s:'Soleus',g:'Bodyweight',pat:'Calf',slot:5,kind:'load',tier:'sedang',def:[[0,20],[0,20],[0,20]],alt:['slcalf','ecchd'],
    cue:[['Setup','Berdiri tegak, ujung kaki di lantai atau tepi step.'],['Gerakan','Naik penuh, turun pelan.'],['Kesalahan','Rentang setengah. Rentang penuh yang membuat tendon beradaptasi.']]},
  ecchd:{n:'Eccentric heel drop',a:'alfredson heel drop eksentrik',p:'Soleus, Gastrocnemius',s:'Tibialis posterior',g:'Step atau plate',pat:'Calf',slot:5,kind:'load',tier:'sedang',def:[[0,15],[0,15],[0,15]],alt:['seatedcalf','slcalf'],
    cue:[['Setup','Naik dengan DUA kaki, turun dengan SATU kaki. Ujung kaki di tepi step.'],['Gerakan','Turun selama tiga hitungan sampai tumit di bawah tepi.'],['Kesalahan','Naik dengan satu kaki juga. Yang dilatih hanya penurunannya.']],
    note:'Protokol Alfredson. Bentuk paling aman memuat Achilles saat beban lain sedang tinggi, dan tidak butuh mesin.'},

  /* ---------- ANKLE ---------- */
  tibtap:{n:'Tibialis tap',a:'tibialis raise anterior tap tibialis',p:'Tibialis anterior',s:'Peroneal',g:'Bodyweight',pat:'Ankle',slot:5,kind:'load',tier:'sedang',def:[[0,20],[0,20],[0,20]],alt:['jalanjinjit','ankleband'],
    cue:[['Setup','Punggung menempel dinding, tumit sekitar 30 cm dari dinding.'],['Gerakan','Angkat ujung kaki ke arah tulang kering, turunkan pelan.'],['Kesalahan','Terlalu cepat. Yang terasa panas di depan tulang kering itu tandanya benar.']],
    note:'Tibialis anterior yang menahan kaki saat mendarat. Lemah di sini berarti benturan lari naik.'},
  ankleband:{n:'Ankle inversion dan eversion dengan band',a:'inversi eversi ankle band',p:'Tibialis posterior, Peroneal',s:'Tibialis anterior',g:'Band',pat:'Ankle',slot:1,kind:'time',tier:'ringan',def:[[30],[30]],alt:['tibtap','wobble'],
    cue:[['Setup','Band diikat ke tiang, kaki lurus, band di sisi telapak kaki.'],['Gerakan','Putar telapak ke dalam lalu ke luar, terkendali.'],['Kesalahan','Menggerakkan seluruh kaki. Yang bergerak hanya pergelangan.']]},
  jalanjinjit:{n:'Jalan jinjit dan jalan tumit',a:'toe walk heel walk jinjit',p:'Tibialis anterior, Soleus',s:'Peroneal',g:'Bodyweight',pat:'Ankle',slot:1,kind:'dist',tier:'ringan',def:[[15,0],[15,0]],alt:['tibtap','ankleband'],
    cue:[['Setup','Berdiri tegak.'],['Gerakan','Lima belas meter jalan jinjit, lalu lima belas meter jalan tumit.'],['Kesalahan','Menurunkan tumit di tengah jalan jinjit.']]},
  wobble:{n:'Wobble board satu kaki',a:'wobble board balance board keseimbangan',p:'Peroneal, Tibialis posterior',s:'Gluteus medius',g:'Wobble board',pat:'Ankle',slot:1,kind:'time',tier:'ringan',def:[[30],[30]],alt:['ankleband','tibtap'],
    cue:[['Setup','Satu kaki di tengah papan, pandangan lurus ke depan.'],['Gerakan','Tahan tanpa menyentuh lantai. Tiga puluh detik per kaki.'],['Kesalahan','Menatap kaki. Pandangan ke depan yang melatih keseimbangan.']]},
  ttoe:{n:'Toe yoga dan spread',a:'toe yoga jari kaki',p:'Tibialis posterior',s:'Peroneal',g:'Bodyweight',pat:'Mobilitas',slot:1,kind:'time',tier:'ringan',def:[[45]],alt:['ankleband'],
    cue:[['Setup','Duduk atau berdiri, telapak kaki menapak penuh.'],['Gerakan','Angkat jempol tanpa jari lain, lalu sebaliknya.'],['Kesalahan','Menggerakkan seluruh telapak. Butuh waktu untuk bisa memisahkan.']]},

  /* ---------- HIP FLEXOR ----------
     Pola sendiri, bukan prehab. Hip flexion berbeban menentukan panjang
     langkah dan kemampuan mengangkat lutut saat pace naik. */
  slhipflex:{n:'Hip flexion satu kaki dengan beban',a:'hip flexion hipflexor angkat lutut beban',p:'Hip flexor',s:'Rectus abdominis',g:'Band',pat:'Hip flexor',slot:5,kind:'load',tier:'berat',def:[[0,12],[0,12],[0,12]],alt:['hangknee','psoasmarch'],
    cue:[['Setup','Band di pergelangan kaki, ujung lain di bawah. Berdiri tegak, pegangan ringan.'],['Gerakan','Angkat lutut sampai di atas sejajar pinggul, tahan sebentar, turun pelan.'],['Kesalahan','Badan rebah ke belakang mencari tenaga. Batang badan tetap tegak.']]},
  hangknee:{n:'Hanging knee raise',a:'hanging knee raise leg raise gantung',p:'Hip flexor, Rectus abdominis',s:'Oblique',g:'Captain chair',pat:'Hip flexor',pat2:'Core',abs:'bawah',slot:5,kind:'load',tier:'berat',def:[[0,12],[0,12],[0,12]],alt:['slhipflex','legraise'],
    cue:[['Setup','Gantung atau di captain chair, pundak turun aktif.'],['Gerakan','Angkat lutut di atas sejajar pinggul, panggul sedikit terselip di akhir.'],['Kesalahan','Mengayun. Kalau mengayun, kurangi rentangnya dulu.']],
    note:'Mengisi Hip flexor dan Core sekaligus.'},
  legraise:{n:'Hanging leg raise di stall bar',a:'leg raise hanging straight leg',p:'Hip flexor, Rectus abdominis',s:'Oblique',g:'Stall bar',pat:'Hip flexor',pat2:'Core',abs:'bawah',slot:5,kind:'load',tier:'berat',def:[[0,8],[0,8],[0,8]],alt:['hangknee','slhipflex'],
    cue:[['Setup','Gantung dengan kaki lurus, pundak aktif turun.'],['Gerakan','Angkat kaki lurus setinggi mungkin tanpa mengayun.'],['Kesalahan','Menekuk lutut untuk mencapai lebih tinggi. Kalau berat, pakai hanging knee raise.']]},
  psoasmarch:{n:'Psoas march terlentang',a:'psoas march dead bug band march',p:'Hip flexor',s:'Transverse abdominis',g:'Band',pat:'Hip flexor',slot:1,kind:'time',tier:'sedang',def:[[40],[40]],alt:['slhipflex','deadbug'],
    cue:[['Setup','Terlentang, band mengait dua kaki, punggung bawah menempel lantai.'],['Gerakan','Dorong satu kaki menjauh sambil menahan satu lainnya menekuk. Bergantian.'],['Kesalahan','Punggung bawah terangkat dari lantai. Itu batas rentangmu.']]},

  /* ---------- CORE ANTI-ROTASI ---------- */
  pallof:{n:'Pallof press',a:'pallof press anti rotasi',p:'Oblique, Transverse abdominis',s:'Gluteus medius',g:'Cable crossover',pat:'Core',abs:'rotasi',slot:6,kind:'time',tier:'berat',def:[[25],[25],[25]],alt:['bandpallof','deadbug'],
    cue:[['Setup','Berdiri menyamping ke kabel setinggi dada, kaki selebar pinggul.'],['Gerakan','Dorong lurus ke depan dan tahan. Tugasnya menahan putaran, bukan bergerak.'],['Kesalahan','Badan berputar mengikuti kabel. Kurangi bebannya.']]},
  bandpallof:{n:'Pallof press dengan band',a:'pallof band anti rotasi band',p:'Oblique, Transverse abdominis',s:'Gluteus medius',g:'Band',pat:'Core',abs:'rotasi',slot:6,kind:'time',tier:'sedang',def:[[30],[30],[30]],alt:['pallof','deadbug'],
    cue:[['Setup','Band diikat setinggi dada, berdiri menyamping.'],['Gerakan','Dorong lurus dan tahan.'],['Kesalahan','Menahan napas. Bernapas normal sambil menahan.']]},
  deadbug:{n:'Dead bug',a:'dead bug deadbug',p:'Rectus abdominis, Transverse abdominis',s:'Hip flexor',g:'Matras',pat:'Core',abs:'anti',slot:6,kind:'time',tier:'sedang',def:[[40],[40]],alt:['birddog','psoasmarch'],
    cue:[['Setup','Terlentang, lutut dan tangan di atas, punggung bawah menempel lantai.'],['Gerakan','Turunkan satu tangan dan kaki berlawanan, punggung tetap menempel.'],['Kesalahan','Punggung bawah terangkat. Perkecil rentangnya.']]},
  birddog:{n:'Bird dog',a:'bird dog quadruped',p:'Erector spinae, Transverse abdominis',s:'Gluteus maximus',g:'Matras',pat:'Core',abs:'anti',slot:6,kind:'time',tier:'ringan',def:[[40],[40]],alt:['deadbug','sidep'],
    cue:[['Setup','Posisi empat tumpuan, punggung netral.'],['Gerakan','Luruskan tangan dan kaki berlawanan, tahan, tukar.'],['Kesalahan','Panggul miring. Bayangkan gelas air di punggung bawah.']]},
  sidep:{n:'Side plank',a:'side plank plank samping',p:'Oblique',s:'Gluteus medius',g:'Matras',pat:'Core',abs:'rotasi',slot:6,kind:'time',tier:'sedang',def:[[40],[40]],alt:['copen','deadbug'],
    cue:[['Setup','Siku di bawah bahu, badan satu garis.'],['Gerakan','Angkat pinggul dan tahan. Pinggul atas jangan jatuh ke belakang.'],['Kesalahan','Pinggul melorot ke bawah tanpa sadar di detik terakhir.']]},
  copen:{n:'Copenhagen plank satu kaki',a:'copenhagen hold adductor plank',p:'Adductor',s:'Oblique',g:'Bench',pat:'Core',abs:'rotasi',slot:6,kind:'time',tier:'berat',def:[[25],[25],[25]],alt:['sidep','deadbug'],
    cue:[['Setup','Siku di lantai, kaki atas di bench dari bagian dalam lutut atau pergelangan.'],['Gerakan','Angkat pinggul dan tahan. Mulai dari versi lutut kalau baru.'],['Kesalahan','Langsung versi pergelangan kaki. Adductor gampang kena kalau dipaksa.']],
    note:'Bukti paling kuat untuk mencegah cedera adductor. Relevan untuk pelari yang juga bermain lapangan.'},
  hollow:{n:'Hollow hold',a:'hollow hold body hollow',p:'Rectus abdominis, Transverse abdominis',s:'Hip flexor',g:'Matras',pat:'Core',abs:'anti',slot:6,kind:'time',tier:'berat',def:[[30],[30],[30]],alt:['plank','deadbug'],
    cue:[['Setup','Terlentang, punggung bawah menempel lantai, tangan dan kaki terangkat.'],['Gerakan','Turunkan tangan dan kaki sejauh punggung masih menempel. Tahan.'],['Kesalahan','Punggung bawah terangkat. Tekuk lutut sedikit sampai bisa menempel lagi.']],
    note:'Melatih perut menahan badan tetap lurus, persis tugasnya saat lari.'},
  revcrunch:{n:'Reverse crunch',a:'reverse crunch crunch terbalik',p:'Rectus abdominis bawah',s:'Hip flexor',g:'Matras',pat:'Core',abs:'bawah',slot:6,kind:'load',tier:'sedang',def:[[0,15],[0,15],[0,15]],alt:['hangknee','legraise'],
    cue:[['Setup','Terlentang, lutut menekuk, tangan di samping badan.'],['Gerakan','Gulung panggul ke arah dada. Yang naik panggul, bukan kaki.'],['Kesalahan','Mengayun kaki ke atas. Kalau panggul tidak terangkat, perut bawah tidak bekerja.']]},
  situp:{n:'Sit-up rentang penuh',a:'situp sit up crunch perut atas',p:'Rectus abdominis atas',s:'Hip flexor',g:'Matras',pat:'Core',abs:'atas',slot:6,kind:'load',tier:'sedang',def:[[0,15],[0,15],[0,15]],alt:['cablecrunch','vup'],
    cue:[['Setup','Terlentang, lutut menekuk, tangan menyilang di dada.'],['Gerakan','Gulung tulang belakang satu per satu, bukan diangkat kaku.'],['Kesalahan','Menarik leher dengan tangan. Taruh tangan di dada, bukan di belakang kepala.']]},
  cablecrunch:{n:'Cable crunch berlutut',a:'cable crunch kneeling crunch',p:'Rectus abdominis atas',s:'Oblique',g:'Cable crossover',pat:'Core',abs:'atas',slot:6,kind:'load',tier:'berat',def:[[25,12],[25,12],[25,12]],alt:['situp','vup'],
    cue:[['Setup','Berlutut menghadap kabel, tali di samping kepala.'],['Gerakan','Gulung tulang belakang ke bawah dengan perut. Pinggul tidak bergerak.'],['Kesalahan','Menarik dengan tangan dan menekuk pinggul. Kunci pinggul di tempatnya.']],
    note:'Satu satunya gerakan perut di gym ini yang bebannya bisa dinaikkan bertahap seperti angkatan lain.'},
  vup:{n:'V-up',a:'v up vup jackknife',p:'Rectus abdominis',s:'Hip flexor',g:'Matras',pat:'Core',abs:'atas',slot:6,kind:'load',tier:'berat',def:[[0,12],[0,12],[0,12]],alt:['situp','hollow'],
    cue:[['Setup','Terlentang lurus, tangan di atas kepala.'],['Gerakan','Angkat tangan dan kaki bersamaan sampai bertemu di atas panggul.'],['Kesalahan','Menghentak dari bahu. Kalau berat, tekuk lutut dulu.']]},
  russian:{n:'Russian twist',a:'russian twist rotasi perut',p:'Oblique',s:'Rectus abdominis',g:'Med ball',pat:'Core',abs:'rotasi',slot:6,kind:'load',tier:'sedang',def:[[6,20],[6,20],[6,20]],alt:['sidep','pallof'],
    cue:[['Setup','Duduk, lutut menekuk, badan condong ke belakang sekitar 45 derajat.'],['Gerakan','Putar batang badan ke kiri dan kanan. Bahu ikut berputar, bukan cuma tangan.'],['Kesalahan','Tangan bergerak tapi bahu diam. Itu bukan rotasi.']]},
  abwheel:{n:'Ab wheel',a:'ab wheel rollout',p:'Rectus abdominis, Transverse abdominis',s:'Latissimus dorsi',g:'Matras',pat:'Core',abs:'anti',slot:6,kind:'load',tier:'berat',def:[[0,8],[0,8],[0,8]],alt:['deadbug','plank'],
    cue:[['Setup','Berlutut, roda di depan lutut, panggul terselip.'],['Gerakan','Gulir ke depan sejauh punggung bawah masih bisa netral.'],['Kesalahan','Punggung bawah melengkung. Itu tanda melewati batas rentangmu.']]},
  plank:{n:'Plank',a:'plank papan',p:'Transverse abdominis',s:'Deltoid',g:'Matras',pat:'Core',abs:'anti',slot:6,kind:'time',tier:'ringan',def:[[45],[45]],alt:['deadbug','sidep'],
    cue:[['Setup','Siku di bawah bahu, badan satu garis dari kepala ke tumit.'],['Gerakan','Kunci glute dan perut, tahan.'],['Kesalahan','Menahan lama dengan pinggul melorot. Lebih baik pendek tapi rapat.']]},

  /* ---------- PLYO DAN POWER ---------- */
  pogo:{n:'Pogo hop di grid',a:'pogo hop pogo',p:'Soleus, Gastrocnemius',s:'Tibialis anterior',g:'Grid ketangkasan',pat:'Plyo',slot:2,kind:'cont',tier:'sedang',def:[[10],[10],[10]],alt:['calfraise','stepdown'],
    cue:[['Setup','Berdiri tegak, lutut hampir lurus, berat di depan kaki.'],['Gerakan','Lompat kecil cepat, kontak sesingkat mungkin. Tinggi tidak penting.'],['Kesalahan','Menekuk lutut dalam tiap lompatan. Pogo itu kerja pergelangan kaki.']],
    note:'Tangga 1 dari 4 pada progresi Achilles: pogo, step-down, box jump, bound.'},
  stepdown:{n:'Box step-down 45 cm',a:'step down box step down eksentrik',p:'Quadriceps, Gluteus maximus',s:'Soleus',g:'Plyo box',pat:'Plyo',slot:2,kind:'box',tier:'sedang',def:[[6,45],[6,45],[6,45]],alt:['pogo','boxjump'],
    cue:[['Setup','Berdiri di atas box, satu kaki menggantung di tepi.'],['Gerakan','Turun selama tiga hitungan sampai tumit menyentuh, lalu naik kembali.'],['Kesalahan','Menjatuhkan badan. Yang dilatih justru kendalinya saat turun.']],
    note:'Tangga 2 dari 4. Eksentrik terkendali, beban tendon paling aman.'},
  boxjump:{n:'Box jump 45 cm',a:'box jump lompat box',p:'Gluteus maximus, Quadriceps',s:'Gastrocnemius',g:'Plyo box',pat:'Plyo',slot:2,kind:'box',tier:'berat',def:[[5,45],[5,45],[5,45]],alt:['stepdown','hurdle'],
    cue:[['Setup','Berdiri satu langkah dari box.'],['Gerakan','Lompat dan mendarat lunak dengan dua kaki. Turun dengan melangkah, jangan melompat turun.'],['Kesalahan','Melompat turun dari box. Itu beban pendaratan dua kali tanpa manfaat.']],
    note:'Tangga 3 dari 4.'},
  hurdle:{n:'Hurdle hop',a:'hurdle hop lompat gawang',p:'Gastrocnemius, Soleus',s:'Quadriceps',g:'Plyo box',pat:'Plyo',slot:2,kind:'box',tier:'berat',def:[[8,15],[8,15],[8,15]],alt:['pogo','boxjump'],
    cue:[['Setup','Rintangan rendah berjajar, jarak satu langkah.'],['Gerakan','Lompat dua kaki, kontak singkat, langsung lompat lagi.'],['Kesalahan','Berhenti di antara lompatan. Yang dilatih justru pantulannya.']]},
  bound:{n:'Bound di turf',a:'bound bounding',p:'Gluteus maximus, Hamstring',s:'Gastrocnemius, Soleus',g:'Turf lane',pat:'Plyo',slot:2,kind:'dist',tier:'berat',def:[[15,0],[15,0],[15,0]],alt:['askip','boxjump'],
    cue:[['Setup','Mulai jalan dua langkah, lalu masuk ke bound.'],['Gerakan','Lompat dari satu kaki ke kaki lain, kejar jarak ke depan bukan tinggi.'],['Kesalahan','Mengejar tinggi. Bound itu horizontal, dan horizontal yang paling dekat dengan gerakan lari.']],
    note:'Tangga 4 dari 4. Paling mirip lari, paling berat untuk tendon.'},
  askip:{n:'A-skip di turf',a:'a skip askip skipping',p:'Hip flexor, Gastrocnemius',s:'Gluteus medius',g:'Turf lane',pat:'Plyo',pat2:'Hip flexor',slot:2,kind:'dist',tier:'sedang',def:[[15,0],[15,0]],alt:['bound','pogo'],
    cue:[['Setup','Postur tegak, pandangan ke depan.'],['Gerakan','Angkat lutut sampai sejajar pinggul lalu jejak tanah aktif ke bawah. Ritme lebih penting dari tinggi.'],['Kesalahan','Lutut naik tapi kaki mendarat pasif. Jejaknya harus aktif ke bawah.']],
    note:'Mengisi Plyo dan Hip flexor sekaligus.'},
  sled:{n:'Sled push di turf',a:'sled push prowler',p:'Gluteus maximus, Quadriceps',s:'Soleus, Gastrocnemius',g:'Sled',pat:'Plyo',slot:2,kind:'dist',tier:'berat',def:[[15,40],[15,40],[15,40],[15,40]],alt:['hillrun','kbswing'],
    cue:[['Setup','Tangan di pegangan, badan condong seperti mau mendorong mobil.'],['Gerakan','Langkah pendek cepat, dorong lewat depan kaki. Napas dibuang tiap langkah.'],['Kesalahan','Langkah terlalu panjang. Sled itu latihan mendorong, bukan latihan melangkah.']],
    note:'Nol beban eksentrik, jadi tidak menambah DOMS yang mengganggu sesi lari berikutnya. Ini alasan sled berharga saat Achilles sedang sensitif.'},
  hillrun:{n:'Hill sprint 10 detik',a:'hill sprint incline sprint tanjakan',p:'Gluteus maximus, Hamstring',s:'Soleus',g:'Treadmill',pat:'Plyo',slot:2,kind:'time',tier:'berat',def:[[10],[10],[10],[10]],alt:['sled','bound'],
    cue:[['Setup','Incline 8 sampai 10 persen, mulai dari berdiri.'],['Gerakan','Sepuluh detik keras, lalu jalan dua menit. Kualitas, bukan jumlah.'],['Kesalahan','Menambah repetisi sampai capek. Begitu pace turun, sesinya sudah selesai.']]},
  halfsquat:{n:'Barbell half squat eksplosif',a:'half squat setengah squat quarter squat explosive',p:'Quadriceps, Gluteus maximus',s:'Soleus',g:'Rak squat',pat:'Squat',pat2:'Plyo',slot:2,kind:'load',tier:'berat',def:[[60,5],[60,5],[60,5]],alt:['boxjump','kbswing'],
    cue:[['Setup','Bar di trapezius, kaki selebar pinggul.'],['Gerakan','Turun seperempat lalu dorong secepat mungkin. Kecepatan yang dikejar, bukan beban.'],['Kesalahan','Menambah beban sampai gerakannya melambat. Begitu melambat, latihannya sudah bukan power.']],
    note:'Mengisi Squat dan Plyo sekaligus. Rentang pendek dengan kecepatan tinggi itu latihan laju produksi gaya.'},
  medslam:{n:'Med ball slam',a:'med ball slam slam ball',p:'Oblique, Latissimus dorsi',s:'Transverse abdominis',g:'Med ball',pat:'Plyo',pat2:'Core',slot:2,kind:'cont',tier:'sedang',def:[[10],[10],[10]],alt:['kbswing','pogo'],
    cue:[['Setup','Bola di atas kepala, kaki selebar pinggul.'],['Gerakan','Lempar ke lantai sekeras mungkin dengan seluruh badan.'],['Kesalahan','Melempar cuma dengan tangan.']],
    note:'Plyo tanpa benturan kaki. Berguna saat Soleus sedang tinggi tapi kamu masih butuh kerja eksplosif.'},

  /* ---------- PRIMER, PREHAB DAN MOBILITAS ---------- */
  crabwalk:{n:'Crab walk dengan band',a:'crabwalk banded lateral walk monster walk',p:'Gluteus medius',s:'Gluteus minimus',g:'Band',pat:'Prehab',slot:1,kind:'time',tier:'ringan',def:[[30],[30]],alt:['clam','wobble'],
    cue:[['Setup','Band di atas lutut atau pergelangan, setengah squat.'],['Gerakan','Langkah ke samping tanpa badan ikut bergoyang.'],['Kesalahan','Badan condong ke arah langkah. Batang badan tetap tegak.']]},
  clam:{n:'Clamshell dengan band',a:'clamshell kerang band',p:'Gluteus medius',s:'Gluteus minimus',g:'Band',pat:'Prehab',slot:1,kind:'time',tier:'ringan',def:[[30],[30]],alt:['crabwalk','birddog'],
    cue:[['Setup','Berbaring menyamping, lutut menekuk, band di atas lutut.'],['Gerakan','Buka lutut atas tanpa panggul ikut berputar.'],['Kesalahan','Panggul ikut mundur. Tumpuk tulang panggul rapi.']]},
  calfstretch:{n:'Calf stretch posisi lunge',a:'calf stretch peregangan lunge gastroc stretch',p:'Gastrocnemius, Soleus',s:'',g:'Bodyweight',pat:'Mobilitas',slot:1,kind:'time',tier:'ringan',def:[[45],[45]],alt:['ttoe','hipflexstretch'],
    cue:[['Setup','Posisi lunge, kaki belakang lurus, tumit menapak.'],['Gerakan','Maju dari pinggul sampai belakang tungkai tertarik. Tahan.'],['Kesalahan','Tumit terangkat. Begitu terangkat, peregangannya hilang.']]},
  hipflexstretch:{n:'Hip flexor stretch',a:'peregangan hip flexor couch stretch',p:'Hip flexor',s:'',g:'Matras',pat:'Mobilitas',slot:1,kind:'time',tier:'ringan',def:[[45],[45]],alt:['calfstretch','ttoe'],
    cue:[['Setup','Berlutut satu kaki, panggul terselip ke depan.'],['Gerakan','Dorong panggul maju, kunci glute sisi belakang. Tahan.'],['Kesalahan','Punggung bawah melengkung. Selipkan panggul dulu, baru maju.']]},
  splitiso:{n:'Split squat isometric hold',a:'split squat isometric hold iso',p:'Quadriceps, Gluteus maximus',s:'Adductor',g:'Bodyweight',pat:'Single-leg',slot:6,kind:'time',tier:'sedang',def:[[30],[30],[30]],alt:['lungehold','wallsit'],
    cue:[['Setup','Posisi split, lutut depan 90 derajat.'],['Gerakan','Tahan tanpa bergerak, berat di kaki depan.'],['Kesalahan','Naik turun sedikit karena capek. Lebih baik berhenti lalu ulang.']]},
  wallsit:{n:'Wall sit',a:'wall sit duduk dinding',p:'Quadriceps',s:'Gluteus maximus',g:'Bodyweight',pat:'Squat',slot:6,kind:'time',tier:'sedang',def:[[45],[45],[45]],alt:['splitiso','lungehold'],
    cue:[['Setup','Punggung menempel dinding, lutut 90 derajat.'],['Gerakan','Tahan. Berat di tumit, bukan di ujung kaki.'],['Kesalahan','Pinggul naik pelan-pelan supaya ringan.']]},
  calfiso:{n:'Calf isometric hold, lutut ditekuk',a:'calf isometric hold soleus iso',p:'Soleus',s:'Tibialis posterior',g:'Step atau plate',pat:'Calf',slot:6,kind:'time',tier:'sedang',def:[[30],[30],[30]],alt:['ecchd','seatedcalf'],
    cue:[['Setup','Berdiri jinjit dengan lutut ditekuk sekitar 30 derajat.'],['Gerakan','Tahan di posisi jinjit penuh.'],['Kesalahan','Lutut ikut lurus. Lutut ditekuk yang membuat soleus bekerja.']],
    note:'Bentuk paling aman memuat soleus dan Achilles saat beban lain masih tinggi.'}
  };

  /* Katalog penuh: pustaka plus gerakan yang kamu tambahkan sendiri.
     Daftar tidak akan pernah lengkap, karena coach memilih gerakan sesuai
     kondisi badanmu hari itu. Yang penting ada jalan masuk untuk gerakan baru
     yang tetap terhubung ke model. */
  let st = { sessions:[], coach:[], gear:{}, mine:{}, abs:{} };
  let swap = {}, edit = null, cq = '', cfilt = 'Semua', copen = false, draft = null;
  let D = {};                          /* dependensi dari app.js */

  const CAT = () => Object.assign({}, EX, st.mine);
  const byId = id => CAT()[id] || null;
  const patsOf = id => { const e = byId(id) || {}; return [e.pat, e.pat2].filter(Boolean); };
  const tierOf = id => { const e = byId(id) || {}; return e.tier || 'sedang'; };
  const gearOk = id => { const e = byId(id); return !e || st.gear[e.g] !== false; };
  const dayNum = k => Math.round(new Date(k + 'T00:00:00').getTime() / 86400000);
  const ago = (k, upto) => dayNum(upto) - dayNum(k);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  async function load() {
    const m = await D.Store.get('meta', 'train');
    if (m) st = Object.assign(st, m);
    if (!st.gear) st.gear = {};
    if (!st.mine) st.mine = {};
    if (!st.abs) st.abs = {};
  }
  function persist() { return D.Store.put('meta', 'train', st); }
  const cap = () => new Date().toISOString();

  /* ============================================================
     BENTUK BARIS UNTUK SINKRONISASI
     Sesi disimpan per hari per jenis, bukan sebagai satu gumpalan besar.
     Kalau digumpalkan, satu hari yang berbeda di dua alat akan membuat
     seluruh riwayat menang atau kalah sekaligus.
     ============================================================ */
  function exportRows() {
    const out = [];
    st.sessions.forEach(x => out.push({ day:x.key, kind:'arete', payload:x, updated_at:x.u || '1970-01-01T00:00:00Z' }));
    st.coach.forEach(x  => out.push({ day:x.key, kind:'coach', payload:x, updated_at:x.u || '1970-01-01T00:00:00Z' }));
    Object.keys(st.abs).forEach(k => {
      const a = st.abs[k];
      if ((a.items || []).length) out.push({ day:k, kind:'abs', payload:a, updated_at:a.u || '1970-01-01T00:00:00Z' });
    });
    return out;
  }
  async function importRows(rows) {
    rows.forEach(r => {
      const p = Object.assign({}, r.payload, { u:r.updated_at });
      if (r.kind === 'arete') {
        p.key = r.day;
        const i = st.sessions.findIndex(x => x.key === r.day);
        if (i >= 0) st.sessions[i] = p; else st.sessions.push(p);
      } else if (r.kind === 'coach') {
        p.key = r.day; p.coach = true;
        const i = st.coach.findIndex(x => x.key === r.day);
        if (i >= 0) st.coach[i] = p; else st.coach.push(p);
      } else if (r.kind === 'abs') {
        st.abs[r.day] = p;
      }
    });
    st.sessions.sort((a, b) => a.key < b.key ? -1 : 1);
    await persist();
  }
  const exportSettings = () => ({ gear:st.gear, mine:st.mine });
  async function importSettings(d) {
    if (d && d.gear) st.gear = d.gear;
    if (d && d.mine) st.mine = Object.assign({}, st.mine, d.mine);
    await persist();
  }

  /* ============================================================
     UTANG POLA GERAK
     Satu angka per pola: berapa hari sejak terakhir dapat beban nyata.
     Kerja ringan tidak mereset hitungan, karena tersentuh bukan berarti
     terisi. Tanpa aturan itu, setiap peregangan akan dihitung sebagai latihan
     dan programnya bolong tanpa kelihatan.
     ============================================================ */
  function realEvents() {
    const out = [];
    st.sessions.forEach(s => (s.items || []).forEach(it => {
      const t = it.tier || tierOf(it.id);
      if (t === 'ringan') return;
      patsOf(it.id).forEach(p => out.push({ key:s.key, p:p, t:t, from:'arete' }));
    }));
    st.coach.forEach(c => (c.items || []).forEach(it => {
      const t = it.tier || tierOf(it.id);
      if (t === 'ringan') return;
      patsOf(it.id).forEach(p => out.push({ key:c.key, p:p, t:t, from:'coach' }));
    }));
    absSessions().forEach(a => a.items.forEach(it => {
      const t = it.tier || tierOf(it.id);
      if (t === 'ringan') return;
      patsOf(it.id).forEach(p => out.push({ key:a.key, p:p, t:t, from:'perut' }));
    }));
    return out;
  }

  function debt(upto) {
    const ev = realEvents().filter(e => e.key <= upto);
    return PATS.map(p => {
      const mine = ev.filter(e => e.p === p).sort((a, b) => a.key < b.key ? 1 : -1);
      const last = mine[0] || null;
      return { p:p, d: last ? ago(last.key, upto) : 21, never: !last,
               from: last ? last.from : null, key: last ? last.key : null };
    }).sort((a, b) => b.d - a.d);
  }
  const topDebt = (upto, n) => debt(upto).slice(0, n || 3);

  /* Beban otot dari peta dipakai sebagai penahan, bukan sebagai saran.
     Tanpa ini penyusun akan memasang box jump tiga hari setelah lomba. */
  function holds(mus) {
    const v = id => { const r = mus && mus.byId ? mus.byId(id) : null; return r ? r.total : 0; };
    const sol = v('soleus'), gas = v('gastroc'), qu = v('quads'), ha = v('hams'), gl = v('glutes');
    const h = {};
    if (sol >= 65 || gas >= 72) h['Plyo'] = `Soleus ${sol} dan Gastrocnemius ${gas}. Plyometrik paling mahal untuk tendon, dan Achilles-mu sensitif.`;
    if (sol >= 82) h['Calf'] = `Soleus ${sol}. Beban betis ditunda, yang masuk cuma isometrik atau heel drop pelan.`;
    if (qu >= 78) h['Squat'] = `Quadriceps ${qu}. Squat berat ditunda dulu.`;
    if (ha >= 78 || gl >= 82) h['Hinge'] = `Hamstring ${ha} dan Glute ${gl}. Hinge berat ditunda dulu.`;
    return h;
  }

  /* ============================================================
     PENYUSUN SESI
     Kerangka enam slot tetap, urutan fisiologis, tidak pernah ditukar.
     Yang berubah isinya.
     ============================================================ */
  const SLOTS = [
    { n:1, t:'Primer', d:'5 menit' },
    { n:2, t:'Power dan plyometrik', d:'kualitas, bukan jumlah' },
    { n:3, t:'Angkatan utama', d:'' },
    { n:4, t:'Angkatan sekunder', d:'' },
    { n:5, t:'Isolasi', d:'' },
    { n:6, t:'Isometrik dan anti-rotasi', d:'' }
  ];
  const UPPER = ['Push','Tarik'];

  /* Tangga plyometrik untuk Achilles. Tangga berikutnya baru dibuka setelah
     tangga sebelumnya dijalani empat sesi. Tanpa aturan ini penyusun akan
     langsung memilih box jump di sesi pertama, dan itu persis cara paling
     cepat membuat Achilles bermasalah. */
  const LADDER = ['pogo','stepdown','boxjump','bound'];
  /* Hurdle hop setara tangga 3 dalam beban tendon, jadi ikut dibatasi.
     Kalau tidak, penyusun akan melewati tangga lewat pintu samping. */
  const RUNG = { pogo:0, stepdown:1, boxjump:2, hurdle:2, bound:3 };
  function ladderMax() {
    let lvl = 0;
    for (let i = 0; i < LADDER.length - 1; i++) {
      if (hist(LADDER[i]).length >= 4) lvl = i + 1; else break;
    }
    return lvl;
  }

  const REGOF = { 'gluteus maximus':'glutes','gluteus medius':'glutes','gluteus minimus':'glutes',
    'hamstring':'hams','quadriceps':'quads','adductor':'adductors','hip flexor':'hipflexor',
    'iliopsoas':'hipflexor','gastrocnemius':'gastroc','gastrocnemius medial':'gastroc',
    'gastrocnemius lateral':'gastroc','soleus':'soleus','tibialis anterior':'tibialis',
    'tibialis posterior':'soleus','peroneal':'tibialis','erector spinae':'lowback',
    'rectus abdominis':'abs','rectus abdominis atas':'abs','rectus abdominis bawah':'abs',
    'transverse abdominis':'abs','oblique':'obliques','external oblique':'obliques',
    'latissimus dorsi':'lats','teres major':'lats','rhomboid':'traps','trapezius':'traps',
    'trapezius tengah':'traps','deltoid':'delts','deltoid anterior':'delts',
    'pectoralis major':'chest','trisep':'triceps','triceps':'triceps','biceps':'biceps','bisep':'biceps',
    'core':'abs' };
  const regOf = m => REGOF[String(m || '').trim().toLowerCase()] || null;

  function pick(pat, slot, mus, used, taken) {
    const C = CAT();
    const load = m => {
      if (!mus || !mus.byId) return 0;
      const id = regOf(m);
      const r = id ? mus.byId(id) : null;
      return r ? r.total : 0;
    };
    const lmax = ladderMax();
    const cands = Object.keys(C).filter(id => {
      const e = C[id];
      if (taken.indexOf(id) >= 0) return false;
      if ([e.pat, e.pat2].indexOf(pat) < 0) return false;
      if (Math.abs((e.slot || 3) - slot) > 1) return false;
      if (!gearOk(id)) return false;
      if (RUNG[id] != null && RUNG[id] > lmax) return false;
      return true;
    });
    if (!cands.length) return null;
    const score = id => {
      const e = C[id];
      const prim = String(e.p || '').split(',').map(x => load(x));
      const mx = prim.length ? Math.max.apply(null, prim) : 0;
      let s = 0;
      if (hist(id).length >= 2) s += 25;             /* lanjutkan progresi yang sudah jalan */
      if ((e.slot || 3) === slot) s += 15;
      if (used.indexOf(id) >= 0) s -= 40;            /* jangan gerakan yang sama dua sesi beruntun */
      if (mx >= 78) s -= 45;                         /* otot utamanya sedang kepayahan */
      else if (mx >= 60) s -= 12;
      if (e.tier === 'berat' && slot <= 4) s += 8;
      return s;
    };
    return cands.sort((a, b) => score(b) - score(a))[0];
  }

  function compose(upto, mus) {
    const h = holds(mus);
    const dl = debt(upto);
    const avail = dl.filter(x => !h[x.p]);
    const bigs = avail.filter(x => BIG.indexOf(x.p) >= 0);
    const why = [];
    Object.keys(h).forEach(p => why.push(`<b>${p} ditahan.</b> ${h[p]}`));

    const prev = st.sessions.filter(s => s.key < upto).sort((a, b) => a.key < b.key ? 1 : -1)[0];
    const used = prev ? (prev.items || []).map(x => x.id) : [];
    const taken = [];
    const out = SLOTS.map(s => Object.assign({}, s, { ex:[] }));
    const put = (i, pat) => {
      if (!pat) return null;
      const id = pick(pat, out[i].n, mus, used, taken);
      if (id) { taken.push(id); out[i].ex.push(id); }
      return id;
    };

    /* Slot 3 dan 4: dua pola besar dengan utang terbesar, diusahakan
       satu bawah satu atas supaya tidak menumpuk di kaki. */
    const p3 = bigs[0] ? bigs[0].p : null;
    let p4 = null;
    if (p3) {
      const atas = UPPER.indexOf(p3) >= 0;
      const lawan = bigs.find(x => x.p !== p3 && (UPPER.indexOf(x.p) >= 0) !== atas);
      p4 = (lawan || bigs.find(x => x.p !== p3) || {}).p || null;
    }
    put(2, p3); put(3, p4);
    if (p3) out[2].d = 'pola ' + p3;
    if (p4) out[3].d = 'pola ' + p4;

    /* Slot 2: plyo kalau tidak ditahan. Kalau ditahan tapi kamu masih butuh
       kerja eksplosif, ada bentuk tanpa benturan kaki. */
    if (!h['Plyo']) { put(1, 'Plyo'); }
    else {
      const aman = ['medslam','kbswing','sled'].filter(id => gearOk(id) && taken.indexOf(id) < 0);
      if (aman.length) {
        taken.push(aman[0]); out[1].ex.push(aman[0]);
        out[1].d = 'tanpa benturan kaki';
        why.push(`<b>Plyometrik diganti bentuk tanpa benturan.</b> ${h['Plyo']} Yang masuk hari ini tetap kerja eksplosif, tapi kakinya tidak menerima pendaratan.`);
      } else {
        out[1].skip = h['Plyo'];
      }
    }

    /* Slot 5: dua isolasi dari Calf, Ankle, dan Hip flexor menurut utang. */
    const kecil = avail.filter(x => ['Calf','Ankle','Hip flexor'].indexOf(x.p) >= 0).slice(0, 2);
    kecil.forEach(x => put(4, x.p));
    out[4].d = kecil.map(x => x.p).join(' dan ') || 'dilewati';

    /* Slot 6: Core selalu, plus satu isometrik dari pola yang BELUM tersentuh
       hari ini. Memasang isometrik betis di sesi yang sudah ada calf raise itu
       menambah beban ke pola yang sudah terisi, sementara sembilan pola lain
       menganggur. */
    put(5, 'Core');
    const sudah = out.reduce((a, s2) => a.concat(s2.ex.map(id => patsOf(id)).reduce((x, y) => x.concat(y), [])), []);
    const iso = ['Single-leg','Squat','Calf'].map(pp => avail.find(x => x.p === pp && sudah.indexOf(pp) < 0)).filter(Boolean)[0];
    if (iso) put(5, iso.p);
    out[5].d = '7 menit';

    /* Slot 1: primer. Aktivasi glute dan pergelangan kaki selalu, karena itu
       dua titik lemah yang kamu tandai sendiri. */
    ['Prehab','Ankle'].forEach(p => put(0, p));

    return { slots:out, why:why, holds:h, debt:dl,
      pola: out.reduce((a, s) => a.concat(s.ex.map(id => patsOf(id)).reduce((x, y) => x.concat(y), [])), [])
    };
  }

  /* ============================================================
     RIWAYAT DAN SARAN KENAIKAN
     Sarannya dihitung dari riwayatmu sendiri, bukan dari template.
     ============================================================ */
  function hist(id) {
    const out = [];
    st.sessions.slice().sort((a, b) => a.key < b.key ? -1 : 1).forEach(s => {
      (s.items || []).forEach(it => {
        if (it.id !== id || !it.sets || !it.sets.length) return;
        const done = it.sets.filter(x => x.done !== false && (x.w != null || x.r != null));
        if (!done.length) return;
        const w = Math.max.apply(null, done.map(x => +x.w || 0));
        const r = Math.max.apply(null, done.map(x => +x.r || 0));
        out.push({ key:s.key, w:w, r:r, sets:done.length });
      });
    });
    return out;
  }
  const e1rm = (w, r) => +(w * (1 + r / 30)).toFixed(1);
  const volOf = h => (h.w || 1) * h.r * h.sets;

  function rx(id) {
    const H = hist(id);
    if (H.length < 3) return { ok:0, t:`Butuh tiga sesi tercatat sebelum Areté bisa menyarankan kenaikan. Sekarang ${H.length}.` };
    const L = H[H.length - 1], P = H[H.length - 2], Q = H[H.length - 3];
    const sameW = L.w === P.w && P.w === Q.w;
    const target = Math.max(L.r, P.r, Q.r);
    if (sameW && L.r >= target && L.w > 0) {
      const step = L.w >= 60 ? 2.5 : L.w >= 20 ? 2 : 1;
      return { ok:1, t:`Sudah tiga sesi di <b>${L.w} kg</b> dan repsnya penuh. Naikkan ke <b>${L.w + step} kg</b> hari ini.` };
    }
    if (sameW && L.w === 0 && L.r >= target) {
      return { ok:1, t:`Tiga sesi di reps yang sama tanpa beban. Tambah beban, atau naikkan ke <b>${L.r + 2} reps</b>.` };
    }
    if (L.r < P.r) return { ok:0, t:`Reps turun dari ${P.r} ke ${L.r} di beban yang sama. Tahan beban dulu, kejar repsnya.` };
    if (L.w > P.w) return { ok:1, t:`Baru naik ke <b>${L.w} kg</b> sesi lalu. Tahan di sini sampai repsnya penuh tiga sesi.` };
    return { ok:0, t:`Belum cukup pola untuk menyarankan kenaikan. Jalankan seperti sesi lalu.` };
  }

  /* ============================================================
     MENU PERUT HARIAN
     Bukan daftar acak. Perut punya empat tugas yang berbeda, dan sesi yang
     cuma plank plus sit-up melewatkan dua di antaranya.

     anti    menahan badan tidak melengkung. Ini tugas perut saat lari.
     bawah   menggulung panggul ke arah dada. Rectus bagian bawah.
     atas    menggulung dada ke arah panggul. Rectus bagian atas.
     rotasi  menahan dan menghasilkan putaran. Oblique.

     Tiap hari satu gerakan per wilayah, dan gerakannya berputar sepanjang
     minggu supaya tidak itu itu saja.
     ============================================================ */
  const ABSREG = [
    ['anti',  'Anti-ekstensi', 'Menahan badan tidak melengkung. Ini yang dipakai perut saat lari.'],
    ['bawah', 'Rectus bawah',  'Menggulung panggul ke arah dada.'],
    ['atas',  'Rectus atas',   'Menggulung dada ke arah panggul.'],
    ['rotasi','Oblique',       'Menahan dan menghasilkan putaran batang badan.']
  ];
  const HOMEGEAR = ['Bodyweight','Band','Matras'];
  function absPool(reg, mode) {
    const C = CAT();
    return Object.keys(C).filter(id => {
      const e = C[id];
      if (e.abs !== reg) return false;
      if (!gearOk(id)) return false;
      if (mode === 'home' && HOMEGEAR.indexOf(e.g) < 0) return false;
      return true;
    }).sort((a, b) => {
      /* Di gym, dahulukan gerakan yang bebannya bisa dinaikkan bertahap.
         Itu satu satunya alasan mengerjakan perut di gym dan bukan di rumah. */
      if (mode === 'gym') {
        const berat = id => (HOMEGEAR.indexOf(C[id].g) < 0 ? 0 : 1);
        if (berat(a) !== berat(b)) return berat(a) - berat(b);
      }
      return C[a].n.localeCompare(C[b].n);
    });
  }
  function absToday(key) {
    const a = st.abs[key] || { mode:'home', items:[] };
    if (!a.items) a.items = [];
    return a;
  }
  /* Gerakan berputar menurut hari, jadi stabil dalam satu hari tapi
     berbeda dari hari ke hari. */
  function absPick(key, mode) {
    const n = dayNum(key);
    return ABSREG.map(([reg]) => {
      const pool = absPool(reg, mode);
      return pool.length ? pool[n % pool.length] : null;
    }).filter(Boolean);
  }

  /* ============================================================
     PENYIMPANAN SESI
     ============================================================ */
  function sessionOf(key) { return st.sessions.find(s => s.key === key) || null; }
  function absSessions() {
    return Object.keys(st.abs).map(k => ({ key:k, abs:true, items:(st.abs[k].items || []) }))
      .filter(x => x.items.length);
  }
  function allSessions() {
    return st.sessions.concat(st.coach).concat(absSessions()).map(s => ({
      key: s.key,
      label: s.coach ? 'Sesi coach' : s.abs ? 'Perut harian' : 'Sesi Areté',
      load: (s.items || []).reduce((a, it) => {
        const t = it.tier || tierOf(it.id);
        const sets = (it.sets && it.sets.length) || it.setsN || 3;
        const reps = (it.sets && it.sets[0] && +it.sets[0].r) || it.r || 10;
        return a + sets * (TIERF[t] || 0.6) * Math.sqrt(Math.max(1, reps) / 10) * 8;
      }, 0),
      items: (s.items || []).map(it => {
        const e = byId(it.id) || {};
        const sets = (it.sets && it.sets.length) || it.setsN || 3;
        const s0 = (it.sets && it.sets[0]) || {};
        return { n:e.n, p:e.p, s:e.s, sets:sets,
                 reps: s0.r != null ? +s0.r : (it.r != null ? it.r : null),
                 secs: e.kind === 'time' ? (s0.r != null ? +s0.r : it.r) : null,
                 tier: it.tier || tierOf(it.id) };
      })
    }));
  }
  /* Bentuk yang dibaca peta beban otot. */
  function liftSessions() {
    return allSessions().filter(s => s.items.length);
  }

  /* ============================================================
     TAMPILAN
     ============================================================ */
  const HEAD = {
    load:'<th>Beban<i>kg</i></th><th>Reps<i>&nbsp;</i></th><th>RIR<i>&nbsp;</i></th>',
    time:'<th colspan="2">Durasi<i>detik</i></th><th>RIR<i>&nbsp;</i></th>',
    cont:'<th colspan="2">Kontak<i>per kaki</i></th><th>RIR<i>&nbsp;</i></th>',
    box: '<th>Kontak<i>&nbsp;</i></th><th>Tinggi<i>cm</i></th><th>RIR<i>&nbsp;</i></th>',
    dist:'<th>Jarak<i>meter</i></th><th>Beban<i>kg</i></th><th>RIR<i>&nbsp;</i></th>'
  };
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  let sel = null, mus = null, cur = null, heatMounted = false;

  function setRow(id, ex, d, i, saved) {
    const warm = d[2] === 'W';
    const idx = warm ? '<span class="idx w">W</span>' : `<span class="idx">${i}</span>`;
    const H = hist(id), last = H.length ? H[H.length - 1] : null;
    const sv = saved || {};
    const num = (k, v, lab, st2) => `<input type="number" inputmode="${st2 ? 'decimal' : 'numeric'}"${st2 ? ' step="' + st2 + '"' : ''}`
      + ` placeholder="${v}" value="${sv[k] != null ? sv[k] : ''}" data-f="${k}" aria-label="${lab}">`;
    let prev = '&mdash;';
    if (last) prev = ex.kind === 'load' ? `${last.w} x ${last.r}`
      : ex.kind === 'time' ? `${last.r} d`
      : ex.kind === 'cont' || ex.kind === 'box' ? `${last.r} kontak` : `${last.r} m`;
    let cells;
    if (ex.kind === 'load') cells = `<td class="wcell">${num('w', d[0], 'Beban dalam kilogram', 1)}</td><td class="rcell">${num('r', d[1], 'Reps')}</td>`;
    else if (ex.kind === 'time') cells = `<td class="wcell" colspan="2">${num('r', d[0], 'Durasi dalam detik')}</td>`;
    else if (ex.kind === 'cont') cells = `<td class="wcell" colspan="2">${num('r', d[0], 'Jumlah kontak')}</td>`;
    else if (ex.kind === 'box') cells = `<td class="wcell">${num('r', d[0], 'Jumlah kontak')}</td><td class="rcell">${num('w', d[1], 'Tinggi boks dalam sentimeter')}</td>`;
    else cells = `<td class="wcell">${num('r', d[0], 'Jarak dalam meter')}</td><td class="rcell">${num('w', d[1], 'Beban dalam kilogram', 1)}</td>`;
    return `<tr class="sets-in${sv.done ? ' done' : ''}" data-ex="${id}" data-i="${i - 1}"><td>${idx}</td><td class="prev">${prev}</td>${cells}
      <td class="icell">${num('rir', 2, 'RIR')}</td>
      <td class="r"><button class="tick" data-tick aria-pressed="${!!sv.done}" aria-label="Tandai set selesai" type="button">&#10003;</button></td></tr>`;
  }

  function sparkOf(id) {
    const H = hist(id);
    if (H.length < 3) return '<p class="tm">Butuh minimal tiga sesi untuk menggambar tren.</p>';
    const rm = H.map(h => h.w > 0 ? e1rm(h.w, h.r) : h.r * h.sets);
    const W = 300, Ht = 46, L = 2, R = 2, T = 5, B = 5;
    let lo = Math.min.apply(null, rm), hi = Math.max.apply(null, rm);
    const pad = (hi - lo) * .35 || 1; lo -= pad; hi += pad;
    const x = i => L + (i / (rm.length - 1)) * (W - L - R);
    const y = v => T + (1 - (v - lo) / (hi - lo)) * (Ht - T - B);
    const d = rm.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    let g = `<path class="ar" d="${d} L${x(rm.length - 1).toFixed(1)} ${Ht - B} L${L} ${Ht - B} Z"/><path class="ln" d="${d}"/>`;
    rm.forEach((v, i) => { g += `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === rm.length - 1 ? 3.4 : 1.8}"/>`; });
    return `<svg class="spark" viewBox="0 0 ${W} ${Ht}" preserveAspectRatio="none">${g}</svg>`;
  }

  function progOf(id) {
    const H = hist(id);
    if (H.length < 3) return `<p class="tm">Belum ada riwayat cukup untuk gerakan ini. Grafik muncul setelah tiga sesi tercatat.</p>${rxBox(id)}`;
    const L = H[H.length - 1], F = H[0];
    const pakaiBeban = L.w > 0;
    const nowV = pakaiBeban ? e1rm(L.w, L.r) : L.r * L.sets;
    const wasV = pakaiBeban ? e1rm(F.w, F.r) : F.r * F.sets;
    const dv = +(nowV - wasV).toFixed(1);
    const vol = volOf(L), dvol = vol - volOf(F);
    const cls = v => v > 0.5 ? 'up' : v < -0.5 ? 'dn' : 'fl';
    const arr = v => v > 0.5 ? '&#9650; +' : v < -0.5 ? '&#9660; ' : '&mdash; ';
    return `${sparkOf(id)}
      <div class="pgrid">
        <div class="pg"><div class="k">${pakaiBeban ? 'Estimasi 1RM' : 'Total kerja'}</div><div class="v">${nowV}</div>
          <div class="d ${cls(dv)}">${arr(dv)}${Math.abs(dv)}${pakaiBeban ? ' kg' : ''}</div></div>
        <div class="pg"><div class="k">Volume sesi</div><div class="v">${vol}</div>
          <div class="d ${cls(dvol)}">${arr(dvol)}${Math.abs(dvol)}</div></div>
      </div>
      <ul class="plast">${H.slice(-3).reverse().map(h =>
        `<li><span>${D.UI.shortDate(h.key).dm}</span><span>${h.w > 0 ? h.w + ' kg x ' + h.r + ' x ' + h.sets : h.r + ' x ' + h.sets}</span></li>`).join('')}</ul>
      ${rxBox(id)}`;
  }
  function rxBox(id) {
    const r = rx(id);
    return r ? `<div class="rx${r.ok ? '' : ' hold'}"><b>Saran hari ini.</b> ${r.t}</div>` : '';
  }

  function altOf(baseId) {
    const id = swap[baseId] || baseId, e = byId(id);
    let ids = ((e && e.alt) || []).filter(a => byId(a) && a !== baseId);
    if (id !== baseId) ids = [baseId].concat(ids);
    ids = ids.filter((a, i) => ids.indexOf(a) === i && a !== id);
    if (!ids.length) return '<p class="tm">Belum ada substitusi terdaftar untuk gerakan ini.</p>';
    return `<ul class="alts">${ids.map(a => {
      const x = byId(a), ok = gearOk(a), back = a === baseId;
      return `<li><button data-swap="${baseId}" data-to="${a}" type="button"${ok ? '' : ' disabled'}>
        <span><span class="an">${esc(x.n)}${back ? '<em class="back">gerakan asal</em>' : ''}</span>
        <span class="am">${esc(x.p)} &middot; ${esc(x.g)} &middot; pola ${x.pat}</span></span>
        <span class="tag2${ok ? ' best' : ''}">${ok ? 'tersedia' : 'alat tidak ada'}</span></button></li>`;
    }).join('')}</ul>`;
  }

  function exCard(baseId, saved) {
    const id = swap[baseId] || baseId, e = byId(id);
    if (!e) return '';
    const mati = !gearOk(id);
    const sv = (saved && saved.sets) || null;
    return `<div class="ex${mati ? ' off' : ''}">
      <div class="ex-h">
        <h3>${esc(e.n)}${swap[baseId] ? '<span class="swapped">diganti</span>' : ''}</h3>
        <p class="tm"><b>${esc(e.p)}</b> &middot; pola ${e.pat}${e.pat2 ? ' dan ' + e.pat2 : ''}</p>
        <div class="ex-acts">
          <button class="mini" data-pane="p" data-id="${baseId}" type="button">Progres</button>
          <button class="mini" data-pane="c" data-id="${baseId}" type="button">Cara</button>
          <button class="mini" data-pane="a" data-id="${baseId}" type="button">Ganti</button>
        </div>
      </div>
      ${mati ? `<div class="tskip"><b>${esc(e.g)} ditandai tidak tersedia.</b> Tekan <b>Ganti</b> untuk memilih pengganti dengan pola gerak yang sama.</div>` : `
      <table class="sets"><thead><tr><th></th><th>Terakhir</th>${HEAD[e.kind]}<th class="r"></th></tr></thead>
        <tbody>${e.def.map((d, i) => setRow(id, e, d, i + 1, sv ? sv[i] : null)).join('')}</tbody></table>`}
      ${e.note ? `<div class="tskip" style="margin-top:9px">${e.note}</div>` : ''}
      <div id="tp-p-${baseId}" hidden style="margin-top:11px">${progOf(id)}</div>
      <div id="tp-c-${baseId}" hidden style="margin-top:4px">
        <ul class="cues"><li><span class="t">Otot</span><span><b>${esc(e.p)}</b>${e.s ? '. Pembantu: ' + esc(e.s) + '.' : '.'} Alat: ${esc(e.g)}.</span></li>
        ${e.cue.map(c => `<li><span class="t">${c[0]}</span><span>${c[1]}</span></li>`).join('')}</ul>
        <div class="demo"><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.n + ' proper form')}" target="_blank" rel="noopener">Tonton video</a></div>
      </div>
      <div id="tp-a-${baseId}" hidden style="margin-top:6px">${altOf(baseId)}</div>
    </div>`;
  }

  /* ---------- kartu sesi coach ---------- */
  function coachOf(upto) {
    /* Sesi coach minggu ini, yaitu tujuh hari ke belakang. */
    return st.coach.filter(c => c.key <= upto && ago(c.key, upto) <= 7)
                   .sort((a, b) => a.key < b.key ? 1 : -1)[0] || null;
  }
  function coachKind(c) {
    if (!c || !(c.items || []).length) return null;
    const berat = [];
    c.items.forEach(it => { if ((it.tier || tierOf(it.id)) === 'berat')
      patsOf(it.id).forEach(p => { if (BIG.indexOf(p) >= 0 && berat.indexOf(p) < 0) berat.push(p); }); });
    if (berat.length >= 2) return `<b>Sesi kekuatan.</b> Coach mengambil ${berat.join(' dan ')} dengan beban berat. Areté tidak mengulangi pola itu dan pindah ke utang terbesar berikutnya.`;
    if (berat.length === 1) return `<b>Prehab dengan satu angkatan berat.</b> Coach cuma mengambil ${berat[0]}. Sisa compound minggu ini jadi tanggungan Areté.`;
    return `<b>Sesi prehab.</b> Tidak ada pola besar yang dapat beban berat, jadi Areté menanggung seluruh kerja compound minggu ini.`;
  }

  function coachCard(upto) {
    const c = coachOf(upto);
    let body;
    if (!c) {
      body = `<p class="tm2"><b>Belum dicatat.</b> Selama belum dicatat, Areté menyusun sesi seolah sepuluh pola masih kosong. Catat dulu, baru sesinya akurat.</p>`;
    } else {
      body = `<p class="tm2">${D.UI.fmt(c.key, true)}. ${c.items.length} gerakan tercatat. ${coachKind(c)}</p>
        <ul class="ci">${c.items.map((it, i) => {
          const e = byId(it.id) || {};
          const t = it.tier || tierOf(it.id);
          const luar = EXTRA.indexOf(e.pat) >= 0;
          const meta = `${luar ? String(e.pat).toLowerCase() : 'pola ' + e.pat} &middot; ${esc(e.p)}${st.mine[it.id] ? ' &middot; gerakan kamu' : ''}`;
          const ang = e.kind === 'time' ? `${it.r} detik x ${it.setsN}`
            : it.w > 0 ? `${it.w} kg x ${it.r} x ${it.setsN}` : `${it.r} x ${it.setsN}`;
          if (edit !== i) return `<li><button class="crow" data-ed="${i}" type="button">
              <span class="cn">${esc(e.n)}<small>${meta}</small></span>
              <span class="cq2">${ang}<small class="t-${t}">${t}</small></span></button></li>`;
          const f = (k, lab, v, s2) => `<label><b>${lab}</b><input type="number" inputmode="${s2 ? 'decimal' : 'numeric'}"${s2 ? ' step="2.5"' : ''} value="${v}" data-ci="${i}" data-k="${k}" aria-label="${lab}"></label>`;
          return `<li class="op">
            <div class="ch"><button class="crow" data-ed="-1" type="button"><span class="cn">${esc(e.n)}<small>${meta}</small></span></button>
              <button class="cx" data-del="${i}" type="button" aria-label="Hapus">&times;</button></div>
            <div class="cin">${e.kind === 'time' ? f('r','Detik',it.r) : f('w','Beban kg',it.w,1) + f('r','Reps',it.r)}${f('setsN','Set',it.setsN)}</div>
            <div class="tsel">${TIERS.map(([v, lab]) => `<button data-ti="${i}" data-tv="${v}" aria-pressed="${t === v}" type="button">${lab}</button>`).join('')}</div>
          </li>`;
        }).join('')}</ul>`;
    }
    const act = copen
      ? `<button data-cw="close" type="button">Selesai mencatat</button>`
      : `<button data-cw="open" type="button">${c ? 'Tambah gerakan' : 'Catat sesi coach'}</button>`
        + (c ? `<button class="ghost" data-cw="clear" type="button">Hapus semua</button>` : '');
    return `<div class="pc-head"><h2>Sesi coach minggu ini</h2></div>${body}
      <div class="cw-act">${act}</div>${copen ? pickPane() : ''}`;
  }

  function pickPane() {
    if (draft) return draftPane();
    const q = cq.trim().toLowerCase(), C = CAT();
    const ids = Object.keys(C).filter(id => {
      const e = C[id];
      if (ALLPAT.indexOf(e.pat) < 0) return false;
      if (cfilt !== 'Semua' && e.pat !== cfilt && e.pat2 !== cfilt) return false;
      if (q && (e.n + ' ' + (e.a || '') + ' ' + e.p + ' ' + e.g).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort((a, b) => C[a].n.localeCompare(C[b].n));
    const c = coachOf(sel);
    const had = id => c && (c.items || []).some(x => x.id === id);
    return `<div class="pick">
      <p class="pl">Cari gerakan yang kamu lakukan</p>
      <input class="q" id="tr-cq" type="search" placeholder="crabwalk, tibialis, copenhagen" value="${esc(cq)}" aria-label="Cari gerakan">
      <div class="pchips" id="tr-cf">${['Semua'].concat(ALLPAT).map(f =>
        `<button data-f="${f}" aria-pressed="${f === cfilt}" type="button">${f}</button>`).join('')}</div>
      ${ids.length ? `<ul class="plist">${ids.map(id => {
        const e = C[id], luar = EXTRA.indexOf(e.pat) >= 0;
        return `<li><button data-add="${id}" type="button"${had(id) ? ' disabled' : ''}>
          <span><span class="pn">${esc(e.n)}${st.mine[id] ? '<em class="back">gerakan kamu</em>' : ''}</span>
          <span class="pm">${luar ? String(e.pat).toLowerCase() + ', di luar pola wajib' : 'pola ' + e.pat} &middot; ${esc(e.g)}</span></span>
          <span class="plus">${had(id) ? '&#10003;' : '+'}</span></button></li>`;
      }).join('')}</ul>` : `<p class="tm">Tidak ada yang cocok dengan <b>${esc(cq)}</b>. Daftar ini tidak akan pernah lengkap, karena coachmu memilih gerakan sesuai kondisi badanmu hari itu. Tambahkan saja.</p>`}
      <button class="newex" data-new="1" type="button">+ Tambah gerakan yang belum ada${cq.trim() ? ': <b>' + esc(cq.trim()) + '</b>' : ''}</button>
    </div>`;
  }

  function draftPane() {
    const d = draft;
    const siap = d.n.trim() && d.pat && d.otot.length;
    return `<div class="pick">
      <p class="pl">Gerakan baru</p>
      <input class="q" id="tr-dn" type="text" placeholder="Nama gerakan" value="${esc(d.n)}" aria-label="Nama gerakan">
      <p class="dq">Pola gerak apa yang diisi gerakan ini?</p>
      <div class="pchips" id="tr-dp">${PATS.map(f => `<button data-dp="${f}" aria-pressed="${f === d.pat}" type="button">${f}</button>`).join('')}
        ${EXTRA.map(f => `<button class="alt" data-dp="${f}" aria-pressed="${f === d.pat}" type="button">${f}</button>`).join('')}</div>
      <p class="dh">Prehab dan mobilitas tidak mengisi pola wajib. Ankle inversion dengan band itu prehab, bukan pengganti calf raise berbeban.</p>
      <p class="dq">Otot mana yang kena? Pilih yang utama.</p>
      <div class="pchips" id="tr-do">${OTOT.map(o => `<button data-do="${esc(o)}" aria-pressed="${d.otot.indexOf(o) >= 0}" type="button">${o}</button>`).join('')}</div>
      <p class="dq">Seberapa berat kerjanya?</p>
      <div class="pchips" id="tr-dt">${TIERS.map(([v, lab]) => `<button data-dt="${v}" aria-pressed="${v === d.tier}" type="button">${lab}</button>`).join('')}</div>
      <p class="dh">Ringan berarti tersentuh, bukan terisi. Areté tetap memasang kerja beratnya untuk pola itu.</p>
      <div class="cw-act">
        <button data-dsave="1" type="button"${siap ? '' : ' disabled'}>Simpan dan catat</button>
        <button class="ghost" data-dcancel="1" type="button">Batal</button>
      </div>
    </div>`;
  }

  /* ---------- ledger utang ---------- */
  function debtCard(c) {
    const h = c.holds, dl = c.debt;
    const pola = c.pola;
    const co = coachOf(sel);
    const cpat = [];
    if (co) (co.items || []).forEach(it => { if ((it.tier || tierOf(it.id)) !== 'ringan') patsOf(it.id).forEach(p => cpat.push(p)); });
    const rows = dl.map(x => {
      const dobel = cpat.indexOf(x.p) >= 0 && pola.indexOf(x.p) >= 0;
      const src = dobel ? 'dobel' : cpat.indexOf(x.p) >= 0 ? 'coach'
        : pola.indexOf(x.p) >= 0 ? 'today' : h[x.p] ? 'tahan' : x.d > AMBANG ? 'bolong' : 'nganggur';
      return { p:x.p, d:x.d, never:x.never, src:src };
    }).sort((a, b) => (a.src === 'tahan' ? 1 : 0) - (b.src === 'tahan' ? 1 : 0) || b.d - a.d);
    const LAB = { coach:'direset coach', today:'diambil hari ini', tahan:'sengaja ditahan',
      bolong:'bolong', nganggur:'menunggu', dobel:'dobel dengan coach' };
    const bolong = rows.filter(r => r.src === 'bolong').map(r => r.p);
    const dobel = rows.filter(r => r.src === 'dobel').map(r => r.p);
    let note = '';
    if (dobel.length) note += `<div class="tclash"><b>${dobel.join(' dan ')} kena dua kali.</b> Coach sudah mengisinya dengan beban nyata, dan sesi hari ini memasangnya lagi. Buka slotnya, tekan Ganti, pilih pola yang utangnya paling besar.</div>`;
    if (bolong.length) note += `<div class="tclash"><b>${bolong.join(', ')} lewat ${AMBANG} hari tanpa beban nyata.</b> Kalau tidak ada sesi lagi sebelum Minggu, pola ini yang hilang dari minggumu.</div>`;
    return `<div class="pc-head"><h2>Utang pola gerak</h2></div>
      <ul class="debt">${rows.map(r => `<li class="d-${r.src}">
        <span class="dp">${r.p}</span>
        <span class="dd">${r.never ? 'belum pernah' : r.d + ' hari'}</span>
        <span class="ds">${LAB[r.src]}</span></li>`).join('')}</ul>
      <p class="dnote">Diurut dari pola yang paling lama tidak dapat beban nyata. Kerja ringan tidak mereset hitungan.</p>
      ${note}`;
  }

  /* ---------- menu perut harian ---------- */
  function absCard() {
    const a = absToday(sel);
    const ids = absPick(sel, a.mode);
    const sudah = (a.items || []).length;
    return `<div class="pc-head"><h2>Perut harian</h2><span class="pc-hint">${sudah ? sudah + ' tercatat' : 'belum dicatat'}</span></div>
      <p class="tm2">Perut punya empat tugas yang berbeda, dan sesi yang cuma plank dan sit-up melewatkan dua di antaranya. Tiap hari satu gerakan per wilayah, dan gerakannya berputar sepanjang minggu.</p>
      <div class="msrc" id="abs-mode">
        <button data-am="home" aria-pressed="${a.mode === 'home'}" type="button">Di rumah</button>
        <button data-am="gym" aria-pressed="${a.mode === 'gym'}" type="button">Di gym</button>
      </div>
      <div id="abs-slots">${ids.map((id, k) => {
        const reg = ABSREG[k] || ABSREG[0];
        const saved = (a.items || []).find(x => x.id === (swap[id] || id));
        return `<div class="slot">
          <div class="slot-h"><span class="n">${k + 1}</span><h2>${reg[1]}</h2></div>
          <p class="tm" style="margin:-4px 0 8px 2px">${reg[2]}</p>
          ${exCard(id, saved)}
        </div>`;
      }).join('')}</div>
      <button class="btn" id="abs-save" type="button">Simpan perut hari ini</button>
      <div class="msg" id="abs-msg"></div>
      <p class="dnote">Perut masuk sebagai pola Core. Begitu tersimpan, hitungan utang Core ikut direset dan beban perut muncul di peta otot.</p>`;
  }

  /* ============================================================
     PETA OTOT SESI HARI INI
     Bukan beban yang sudah menumpuk, tapi otot mana yang akan kena
     oleh sesi hari ini. Dua pertanyaan yang berbeda, jadi dua peta.
     ============================================================ */
  function sessionHeat(ids) {
    const h = {};
    ids.forEach(id => {
      const e = byId(id); if (!e) return;
      String(e.p || '').split(',').forEach(n => { const r = regOf(n); if (r) h[r] = Math.min(100, (h[r] || 0) + 55); });
      String(e.s || '').split(',').forEach(n => { const r = regOf(n); if (r) h[r] = Math.min(100, (h[r] || 0) + 22); });
    });
    return h;
  }
  function heatData(h) {
    return { byId: id => ({ id:id, total:h[id] || 0, run:0, lift:h[id] || 0 }) };
  }
  function heatTop(h) {
    return Object.keys(h).sort((a, b) => h[b] - h[a]).slice(0, 4).map(id => {
      const r = window.Muscle ? (window.Muscle.REG.find(x => x.id === id) || {}) : {};
      return { id:id, label:r.label || id, v:h[id] };
    });
  }

  /* ============================================================
     RINGKASAN SESI
     Beban yang benar benar terangkat, plus satu pembanding yang jujur.
     Yang dihitung cuma beban luar. Gerakan berat badan tidak ikut karena
     porsi berat badan yang terangkat beda beda tiap gerakan, dan menebaknya
     akan membuat angkanya terlihat besar tanpa dasar.
     ============================================================ */
  const BANDING = [
    { n:19,   t:'galon air 19 liter',        ic:'galon' },
    { n:25,   t:'karung beras 25 kg',        ic:'beras' },
    { n:100,  t:'motor bebek',               ic:'motor' },
    { n:400,  t:'sapi dewasa',               ic:'sapi'  },
    { n:1100, t:'mobil Avanza',              ic:'mobil' },
    { n:3000, t:'gajah Sumatera',            ic:'gajah' },
    { n:4500, t:'truk Colt Diesel kosong',   ic:'truk'  }
  ];
  /* Ilustrasi dibuat dari bentuk terpisah, bukan satu path dengan subpath
     yang saling menimpa. Kalau digabung, bagian yang arah gambarnya berlawanan
     akan berlubang dan sapi jadi terlihat seperti kotak berlubang dua. */
  const ICO = {
    galon:'<rect x="26" y="5" width="12" height="7" rx="2"/><rect x="16" y="11" width="32" height="48" rx="9"/><rect x="22" y="21" width="20" height="9" rx="2" fill="var(--bg)"/>',
    beras:'<path d="M18 22c4-7 8-11 14-11s10 4 14 11c2 3 2 6 2 9l-3 20a8 8 0 01-8 7H27a8 8 0 01-8-7l-3-20c0-3 0-6 2-9z"/><rect x="22" y="28" width="20" height="8" fill="var(--bg)"/><path d="M25 12l7-5 7 5z"/>',
    motor:'<circle cx="15" cy="46" r="11"/><circle cx="15" cy="46" r="5" fill="var(--bg)"/><circle cx="49" cy="46" r="11"/><circle cx="49" cy="46" r="5" fill="var(--bg)"/><path d="M15 46 32 30h10l7 16z" /><rect x="28" y="24" width="18" height="7" rx="3"/><rect x="44" y="14" width="14" height="5" rx="2"/><path d="M44 19h5v10h-5z"/>',
    sapi:'<rect x="20" y="20" width="34" height="23" rx="7"/><rect x="4" y="25" width="19" height="17" rx="6"/><rect x="24" y="41" width="6" height="15" rx="2"/><rect x="34" y="41" width="6" height="15" rx="2"/><rect x="42" y="41" width="6" height="15" rx="2"/><rect x="50" y="41" width="6" height="15" rx="2"/><path d="M6 25 2 17l6 3zM20 25l4-8-6 3z"/><path d="M54 24l8-5 2 4-9 5z"/><circle cx="10" cy="32" r="2" fill="var(--bg)"/>',
    mobil:'<path d="M21 23h22a7 7 0 016 4l5 11H10l5-11a7 7 0 016-4z"/><rect x="24" y="26" width="16" height="10" rx="2" fill="var(--bg)"/><rect x="5" y="37" width="54" height="12" rx="5"/><circle cx="18" cy="50" r="7"/><circle cx="46" cy="50" r="7"/><circle cx="18" cy="50" r="3" fill="var(--bg)"/><circle cx="46" cy="50" r="3" fill="var(--bg)"/>',
    gajah:'<rect x="24" y="17" width="34" height="28" rx="10"/><rect x="6" y="19" width="24" height="26" rx="10"/><rect x="14" y="22" width="15" height="19" rx="7"/><path d="M9 40c-4 5-6 10-5 14a4 4 0 008 0c0-3 1-6 4-9z"/><rect x="26" y="44" width="7" height="13" rx="2"/><rect x="36" y="44" width="7" height="13" rx="2"/><rect x="46" y="44" width="7" height="13" rx="2"/><circle cx="11" cy="28" r="2" fill="var(--bg)"/>',
    truk:'<rect x="3" y="18" width="31" height="26" rx="3"/><path d="M37 24h11l10 12v8H37z"/><rect x="41" y="27" width="10" height="8" rx="2" fill="var(--bg)"/><rect x="3" y="44" width="55" height="4"/><circle cx="16" cy="51" r="7"/><circle cx="48" cy="51" r="7"/><circle cx="16" cy="51" r="3" fill="var(--bg)"/><circle cx="48" cy="51" r="3" fill="var(--bg)"/>'
  };
;
  /* Pembanding yang dipilih adalah yang angkanya paling enak dibaca, yaitu
     bilangan bulat antara 2 dan 12. Satu koma sembilan sapi bukan gambaran
     yang membantu siapa pun. */
  function bandingOf(kg) {
    if (kg < 40) return null;
    const skor = b => {
      const n = kg / b.n;
      if (n < 2) return -1;
      if (n > 40) return -1;
      return 100 - Math.abs(n - 6) * 4 - (n > 12 ? 25 : 0);
    };
    let best = null, bs = -1;
    BANDING.forEach(b => { const v = skor(b); if (v > bs) { bs = v; best = b; } });
    if (!best) return null;
    return { t: best.t, ic: best.ic, n: Math.round(kg / best.n) };
  }
  function ringkas(rec) {
    if (!rec || !(rec.items || []).length) return '';
    let kg = 0, set = 0, reps = 0, detik = 0, luar = 0;
    rec.items.forEach(it => {
      const e = byId(it.id) || {};
      (it.sets || []).forEach(x => {
        set++;
        if (e.kind === 'time') detik += +x.r || 0;
        else reps += +x.r || 0;
        if (e.kind === 'load' && (+x.w || 0) > 0) { kg += (+x.w) * (+x.r || 0); luar++; }
      });
    });
    const b = kg > 0 ? bandingOf(kg) : null;
    const angka = [
      ['Beban terangkat', kg > 0 ? Math.round(kg).toLocaleString('id-ID') : '—', kg > 0 ? 'kg' : ''],
      ['Set', set, ''],
      [detik > reps ? 'Total tahan' : 'Total reps', detik > reps ? Math.round(detik / 60 * 10) / 10 : reps, detik > reps ? 'menit' : '']
    ];
    return `<div class="pc-head"><h2>Sesi ini</h2></div>
      <div class="rgrid">${angka.map(([k, v, u]) =>
        `<div class="rg"><div class="k">${k}</div><div class="v">${v}<span class="u">${u ? ' ' + u : ''}</span></div></div>`).join('')}</div>
      ${b ? `<div class="banding"><span class="bic"><svg viewBox="0 0 64 64" aria-hidden="true">${ICO[b.ic]}</svg></span>
        <p>Kira kira setara mengangkat <b>${String(b.n).replace('.', ',')} ${b.t}</b>.</p></div>` : ''}
      <p class="dnote">Yang dihitung cuma beban luar. Gerakan berat badan tidak ikut, karena porsi badan yang benar benar terangkat beda beda tiap gerakan dan menebaknya cuma membuat angkanya terlihat besar tanpa dasar.</p>`;
  }

  /* ---------- ringkasan progres ---------- */
  function sumPanel() {
    const ids = Object.keys(CAT()).filter(id => hist(id).length >= 1);
    if (!ids.length) return `<div class="card"><p class="tm">Belum ada gerakan tercatat. Setelah sesi pertama disimpan, halaman ini mengurutkan semua gerakan dari yang paling butuh perhatian.</p></div>`;
    const rows = ids.map(id => {
      const H = hist(id), L = H[H.length - 1], P = H[H.length - 2] || L, Q = H[H.length - 3] || P;
      const pakaiBeban = L.w > 0;
      const now = pakaiBeban ? e1rm(L.w, L.r) : L.r * L.sets;
      const prev = pakaiBeban ? e1rm(P.w, P.r) : P.r * P.sets;
      const mandek = pakaiBeban && L.w === P.w && P.w === Q.w;
      const r = rx(id);
      const stt = r && r.ok && mandek ? ['up','naikkan'] : now < prev - 0.5 ? ['dn','turun']
        : mandek ? ['hold','mandek'] : ['up','naik'];
      return { id:id, name:(byId(id) || {}).n || id, now:now, unit:pakaiBeban ? 'kg' : '', st:stt, r:r,
        rank: stt[1] === 'naikkan' ? 0 : stt[0] === 'dn' ? 1 : stt[0] === 'hold' ? 2 : 3 };
    }).sort((a, b) => a.rank - b.rank);
    return `<div class="card"><div class="card-head"><h2>Semua gerakan</h2></div>
      ${rows.map(r => `<div class="sumrow">
        <div class="nm">${esc(r.name)}<small>${r.r ? r.r.t.replace(/<\/?b>/g, '') : ''}</small></div>
        <div class="v">${r.now}${r.unit ? ' ' + r.unit : ''}</div>
        <div class="stt ${r.st[0]}">${r.st[1]}</div></div>`).join('')}</div>`;
  }

  /* ---------- render utama ---------- */
  function render(ctx) {
    sel = ctx.sel; mus = ctx.mus;
    const $ = D.$, $$ = D.$$;
    const root = $('.view[data-view="train"]');
    if (!root) return;

    const saved = sessionOf(sel);
    cur = compose(sel, mus);

    const nama = cur.slots[2].ex.length ? (byId(cur.slots[2].ex[0]) || {}).pat : null;
    const nama2 = cur.slots[3].ex.length ? (byId(cur.slots[3].ex[0]) || {}).pat : null;
    $('#tr-title').textContent = nama ? `Sesi ${nama}${nama2 ? ' dan ' + nama2 : ''}` : 'Sesi hari ini';
    $('#tr-sub').textContent = D.UI.fmt(sel, true) + (saved && saved.done ? ' · sudah selesai' : '');
    $('#tr-why').innerHTML = cur.why.length
      ? cur.why.map(w => `<div class="adj"><i></i><p>${w}</p></div>`).join('')
      : '';

    /* peta otot sesi hari ini */
    const ids = cur.slots.reduce((a, s2) => a.concat(s2.ex.map(x => swap[x] || x)), []);
    const heat = sessionHeat(ids);
    const hd = heatData(heat);
    const hEl = $('#tr-heat');
    if (hEl && window.Muscle) {
      if (!heatMounted) { Muscle.mount($('#tr-heat-svg')); heatMounted = true; }
      Muscle.paint($('#tr-heat-svg'), hd, 'all', null);
      $('#tr-heat-top').innerHTML = heatTop(heat).map(r =>
        `<span class="hchip" style="--hc:${Muscle.col(r.v)}">${r.label}</span>`).join('');
    }
    $('#c-ring').innerHTML = ringkas(saved);
    $('#c-ring').hidden = !saved;
    $('#c-coach').innerHTML = coachCard(sel);
    $('#c-debt').innerHTML = debtCard(cur);

    $('#tr-slots').innerHTML = cur.slots.map(s => {
      const items = s.ex.map(id => exCard(id, saved ? (saved.items || []).find(x => x.id === (swap[id] || id)) : null)).join('');
      return `<div class="slot">
        <div class="slot-h"><span class="n">${s.n}</span><h2>${s.t}</h2><em>${s.d || ''}</em></div>
        ${s.skip ? `<div class="tskip">${s.skip}</div>` : (items || `<div class="tskip">Tidak ada gerakan yang cocok untuk slot ini dengan alat yang tersedia.</div>`)}
      </div>`;
    }).join('');

    $('#tr-save').textContent = saved && saved.done ? 'Sudah tersimpan, simpan ulang' : 'Simpan sesi';
    $('#c-abs').innerHTML = absCard();
    $('#tr-sum').innerHTML = sumPanel();
    wire();
  }

  /* ---------- pengikatan tombol ---------- */
  let rt = 0, rh = null;
  function startRest(secs) {
    const el = D.$('#tr-rest'), t = D.$('#tr-rest-t');
    if (!el) return;
    rt = secs; t.textContent = fmtT(rt); el.classList.add('on');
    clearInterval(rh);
    rh = setInterval(() => { rt--; t.textContent = fmtT(Math.max(0, rt));
      if (rt <= 0) { clearInterval(rh); el.classList.remove('on'); } }, 1000);
  }
  const fmtT = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  function refresh() { render({ sel:sel, mus:mus }); }
  function reCoach() { D.$('#c-coach').innerHTML = coachCard(sel); wire(); }

  function wire() {
    const $ = D.$, $$ = D.$$;

    const SL = '#tr-slots [data-tick], #abs-slots [data-tick]';
    $$(SL).forEach(b => b.onclick = () => {
      const on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', String(!on));
      b.closest('tr').classList.toggle('done', !on);
      if (!on) startRest(120);
    });
    $$('#tr-slots [data-pane], #abs-slots [data-pane]').forEach(b => b.onclick = () => {
      const k = b.dataset.pane, id = b.dataset.id;
      ['p','c','a'].forEach(o => { const el = $('#tp-' + o + '-' + id); if (el && o !== k) el.hidden = true; });
      const el = $('#tp-' + k + '-' + id);
      el.hidden = !el.hidden;
      $$(`[data-id="${id}"]`).forEach(x => {
        x.textContent = x.dataset.pane === 'p' ? 'Progres' : x.dataset.pane === 'c' ? 'Cara' : 'Ganti'; });
      if (!el.hidden) b.textContent = 'Tutup';
    });
    $$('#tr-slots [data-swap], #abs-slots [data-swap]').forEach(b => b.onclick = () => {
      const base = b.dataset.swap, to = b.dataset.to;
      if (to === base) delete swap[base]; else swap[base] = to;
      const diPerut = !!b.closest('#abs-slots');
      if (diPerut) { $('#c-abs').innerHTML = absCard(); wire(); }
      else refresh();
      const el = $('#tp-a-' + base); if (el) el.hidden = false;
    });

    /* sesi coach */
    $$('#c-coach [data-cw]').forEach(b => b.onclick = async () => {
      const a = b.dataset.cw;
      if (a === 'open') copen = true;
      if (a === 'close') { copen = false; cq = ''; cfilt = 'Semua'; draft = null; edit = null; }
      if (a === 'clear') { st.coach = st.coach.filter(c => ago(c.key, sel) > 7); await persist(); }
      refresh();
    });
    $$('#c-coach [data-ed]').forEach(b => b.onclick = () => {
      const i = +b.dataset.ed; edit = i < 0 ? null : i; reCoach();
    });
    $$('#c-coach [data-del]').forEach(b => b.onclick = async () => {
      const c = coachOf(sel); if (!c) return;
      c.items.splice(+b.dataset.del, 1); edit = null; c.u = cap();
      if (!c.items.length) st.coach = st.coach.filter(x => x !== c);
      await persist(); refresh();
    });
    $$('#c-coach [data-ci]').forEach(inp => inp.oninput = async () => {
      const c = coachOf(sel); if (!c) return;
      c.items[+inp.dataset.ci][inp.dataset.k] = +inp.value || 0;
      c.u = cap(); await persist();
    });
    $$('#c-coach [data-ti]').forEach(b => b.onclick = async () => {
      const c = coachOf(sel); if (!c) return;
      c.items[+b.dataset.ti].tier = b.dataset.tv; c.u = cap(); await persist(); refresh();
    });
    $$('#c-coach [data-add]').forEach(b => b.onclick = async () => {
      const id = b.dataset.add, e = byId(id);
      let c = coachOf(sel);
      if (!c) { c = { key:sel, coach:true, items:[] }; st.coach.push(c); }
      c.u = cap();
      if (c.items.some(x => x.id === id)) return;
      const d = (e.def || [[0, 10]])[(e.def || [[0, 10]]).length - 1];
      c.items.push({ id:id, w: e.kind === 'load' ? (d[0] || 0) : 0,
        r: e.kind === 'time' ? (d[0] || 30) : (d[1] != null ? d[1] : 10), setsN:3, tier: tierOf(id) });
      edit = c.items.length - 1;
      await persist(); refresh();
    });
    $$('#tr-cf button').forEach(b => b.onclick = () => { cfilt = b.dataset.f; reCoach(); });
    const q = $('#tr-cq');
    if (q) q.oninput = () => {
      cq = q.value; const pos = q.selectionStart;
      reCoach();
      const n = $('#tr-cq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
    };
    $$('#c-coach [data-new]').forEach(b => b.onclick = () => {
      draft = { n: cq.trim(), pat:'', otot:[], tier:'sedang' }; reCoach();
    });
    $$('#c-coach [data-dp]').forEach(b => b.onclick = () => { draft.pat = b.dataset.dp; reCoach(); });
    $$('#c-coach [data-do]').forEach(b => b.onclick = () => {
      const o = b.dataset.do, i = draft.otot.indexOf(o);
      if (i < 0) draft.otot.push(o); else draft.otot.splice(i, 1); reCoach();
    });
    $$('#c-coach [data-dt]').forEach(b => b.onclick = () => { draft.tier = b.dataset.dt; reCoach(); });
    const dn = $('#tr-dn');
    if (dn) dn.oninput = () => { draft.n = dn.value;
      $$('#c-coach [data-dsave]').forEach(x => x.disabled = !(dn.value.trim() && draft.pat && draft.otot.length)); };
    $$('#c-coach [data-dcancel]').forEach(b => b.onclick = () => { draft = null; reCoach(); });
    $$('#c-coach [data-dsave]').forEach(b => b.onclick = async () => {
      const d = draft;
      const id = 'mine_' + d.n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      st.mine[id] = { n:d.n.trim(), a:d.n.trim(), p:d.otot.join(', '), s:'', g:'Bodyweight',
        pat:d.pat, slot:5, kind: d.tier === 'ringan' ? 'time' : 'load', tier:d.tier,
        def: d.tier === 'ringan' ? [[30],[30]] : [[0,10],[0,10],[0,10]],
        cue:[['Catatan','Gerakan yang kamu tambahkan sendiri. Cue belum diisi.']], alt:[] };
      let c = coachOf(sel);
      if (!c) { c = { key:sel, coach:true, items:[] }; st.coach.push(c); }
      c.u = cap();
      c.items.push({ id:id, w:0, r: d.tier === 'ringan' ? 30 : 10, setsN:3, tier:d.tier });
      edit = c.items.length - 1; draft = null; cq = '';
      await persist(); refresh();
      if (D.onChange) D.onChange();
      if (window.Sync) Sync.dorong();
    });

    /* perut harian */
    $$('#abs-mode button').forEach(b => b.onclick = async () => {
      const a = absToday(sel); a.mode = b.dataset.am; a.u = cap(); st.abs[sel] = a;
      await persist(); $('#c-abs').innerHTML = absCard(); wire();
    });
    const av = $('#abs-save');
    if (av) av.onclick = async () => {
      const a = absToday(sel);
      const items = readRows('#abs-slots');
      if (!items.length) { flash('Tandai centang minimal satu set dulu. Yang belum dicentang tidak dihitung.', '#abs-msg'); return; }
      a.items = items; a.u = cap(); st.abs[sel] = a;
      await persist();
      /* Gambar ulang dulu, baru pesannya ditulis. Kalau dibalik, pesannya
         ikut terhapus karena kartu perut digambar ulang seluruhnya. */
      if (D.onChange) D.onChange();
      if (window.Sync) Sync.dorong();
      flash(`Tersimpan. ${items.length} gerakan perut, ${items.reduce((x, y) => x + y.sets.length, 0)} set. Pola Core ikut direset.`, '#abs-msg');
    };

    /* simpan sesi */
    const sv = $('#tr-save');
    if (sv) sv.onclick = async () => {
      const items = readRows('#tr-slots');
      if (!items.length) { flash('Tandai centang minimal satu set dulu. Yang belum dicentang tidak dihitung.'); return; }
      const lama = st.sessions.findIndex(x => x.key === sel);
      const rec = { key:sel, done:true, items:items, u:cap() };
      if (lama >= 0) st.sessions[lama] = rec; else st.sessions.push(rec);
      st.sessions.sort((a, b) => a.key < b.key ? -1 : 1);
      await persist();
      flash(`Tersimpan. ${items.length} gerakan, ${items.reduce((a, x) => a + x.sets.length, 0)} set. Hitungan utang pola dan peta beban otot sudah ikut berubah.`);
      swap = {};
      if (D.onChange) D.onChange();
      if (window.Sync) Sync.dorong();
    };
    const rs = $('#tr-rest-skip'), ra = $('#tr-rest-add');
    if (rs) rs.onclick = () => { clearInterval(rh); $('#tr-rest').classList.remove('on'); };
    if (ra) ra.onclick = () => { rt += 30; $('#tr-rest-t').textContent = fmtT(rt); };
  }
  /* Baca baris set yang sudah dicentang dari satu wadah. */
  function readRows(root) {
    const out = {}, order = [];
    D.$$(root + ' tr[data-ex]').forEach(tr => {
      const id = tr.dataset.ex;
      if (!tr.querySelector('.tick') || tr.querySelector('.tick').getAttribute('aria-pressed') !== 'true') return;
      const o = { done:true };
      tr.querySelectorAll('input[data-f]').forEach(inp => {
        const v = inp.value === '' ? inp.placeholder : inp.value;
        o[inp.dataset.f] = v === '' ? null : +v;
      });
      if (!out[id]) { out[id] = { id:id, tier:tierOf(id), sets:[] }; order.push(id); }
      out[id].sets.push(o);
    });
    return order.map(id => out[id]);
  }

  function flash(msg, sel2) {
    const el = D.$(sel2 || '#tr-msg'); if (!el) return;
    el.textContent = msg; el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 5000);
  }

  /* ---------- Profil: inventaris alat dan pustaka ---------- */
  function renderGear(el) {
    el.innerHTML = `<p class="note-sm">Tekan alat yang <b>tidak</b> tersedia atau sedang rusak. Penyusun sesi langsung berhenti memakainya dan memilih pengganti dengan pola gerak yang sama.</p>
      <div class="pchips" id="gear-chips">${GEAR.map(g =>
        `<button data-g="${esc(g)}" aria-pressed="${st.gear[g] === false}" type="button">${g}</button>`).join('')}</div>`;
    D.$$('#gear-chips button').forEach(b => b.onclick = async () => {
      const g = b.dataset.g, off = st.gear[g] === false;
      if (off) delete st.gear[g]; else st.gear[g] = false;
      b.setAttribute('aria-pressed', String(!off));
      await persist();
      if (window.Sync) Sync.tandaiSetting();
      if (D.onChange) D.onChange();
      if (window.Sync) Sync.dorong();
    });
  }
  function renderLib(el) {
    const C = CAT(), ids = Object.keys(C).sort((a, b) => C[a].n.localeCompare(C[b].n));
    const own = ids.filter(id => st.mine[id]).length;
    el.innerHTML = `<p class="note-sm">${ids.length} gerakan terdaftar, ${own} di antaranya kamu tambahkan sendiri. Gerakan baru ditambahkan dari kartu sesi coach di tab Latihan.</p>
      <div class="loglist">${PATS.concat(EXTRA).map(p => {
        const n = ids.filter(id => C[id].pat === p || C[id].pat2 === p).length;
        return `<div class="rowitem"><div class="d">${p}</div><div class="m">${n} gerakan</div><div></div></div>`;
      }).join('')}</div>`;
  }

  function init(deps) { D = deps; return load(); }

  /* Pola besar yang diambil sesi hari ini. Dipakai judul di Beranda. */
  function todayPatterns(key, mus) {
    const c = compose(key, mus);
    const out = [];
    [2, 3].forEach(i => c.slots[i].ex.forEach(id => patsOf(id).forEach(p => {
      if (BIG.indexOf(p) >= 0 && out.indexOf(p) < 0) out.push(p); })));
    return out;
  }

  return { init, load, render, sessionOf, allSessions, liftSessions, topDebt, debt, todayPatterns,
           exportRows, importRows, exportSettings, importSettings,
           renderGear, renderLib, PATS, EXTRA, GEAR, EX,
           /* dipakai uji otomatis, bukan oleh tampilan */
           _compose: compose, _holds: holds, _state: () => st, _hist: hist };
})();
