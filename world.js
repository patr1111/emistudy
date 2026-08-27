(function (global) {
  const charasByTaste = {
    kawaii: [
      { id: "kirari", name: "きらり", trait: "リボンが好きな女の子。大きな声でうたう。" },
      { id: "miko", name: "みーこ", trait: "甘えん坊のねこ。だっこが大好き。" },
      { id: "anko", name: "あんこ", trait: "お菓子が好きなうさぎ。" },
      { id: "pochi", name: "ぽち", trait: "元気ないぬ。おさんぽが好き。" },
      { id: "hina", name: "ひな", trait: "はずかしがり屋。いちごが好き。" },
      { id: "momo", name: "もも", trait: "ソフトクリームが大好き。" }
    ],
    kakkoii: [
      { id: "ryu", name: "りゅう", trait: "やさしいきょうりゅう。ほねが好き。" },
      { id: "ken", name: "けん", trait: "元気な男の子。ぼうけんが好き。" },
      { id: "robo", name: "ロボ", trait: "ともだちロボット。パワー全開。" },
      { id: "sota", name: "そうた", trait: "サッカーがとくい。ゴールをねらう。" },
      { id: "gou", name: "ゴウ", trait: "おもちゃのよろいをきるヒーロー。" },
      { id: "kakeru", name: "カケル", trait: "はなびが大好き。夜空をみる。" }
    ],
    cool: [
      { id: "nao", name: "なお", trait: "おだやかなお兄さん。話をよく聞く。" },
      { id: "aya", name: "あや", trait: "落ち着いたお姉さん。本が好き。" },
      { id: "sensei", name: "せんせい", trait: "やさしい先生。教えてくれる。" },
      { id: "kuro", name: "くろ", trait: "シックなワンちゃん。おすわり上手。" },
      { id: "jun", name: "じゅん", trait: "静かな男の子。観察が好き。" },
      { id: "misaki", name: "みさき", trait: "落ち着いたお姉さん。花が好き。" }
    ]
  };
  const defaultPlayer = { kawaii: "kirari", kakkoii: "ken", cool: "nao" };
  const defaultFriend = { kawaii: "momo", kakkoii: "ryu", cool: "aya" };
  const allCharas = charasByTaste.kawaii.concat(charasByTaste.kakkoii, charasByTaste.cool);
  const charIdsByTaste = {
    kawaii: charasByTaste.kawaii.map((c) => c.id),
    kakkoii: charasByTaste.kakkoii.map((c) => c.id),
    cool: charasByTaste.cool.map((c) => c.id)
  };
  const allCharIds = allCharas.map((c) => c.id);
  const defaultNames = {};
  allCharas.forEach((c) => { defaultNames[c.id] = c.name; });

  const shopPlaces = {
    kawaii: [
      ["いちごのおか", "🍓"], ["リボンステージ", "🎀"], ["ハートカフェ", "💗"], ["きらめきドーム", "✨"], ["おはなのひろば", "🌸"],
      ["みみのもり", "🐰"], ["キャンディどおり", "🍬"], ["ほしのへや", "⭐"], ["ピンクのはし", "🌉"], ["うたのひろば", "🎤"],
      ["レースのには", "🌷"], ["マカロンやま", "🍪"], ["きらきらどおり", "💎"], ["おどりのへや", "💃"], ["おてがみポスト", "💌"],
      ["ライトステージ", "💡"], ["さくらんぼざか", "🍒"], ["ベルのとう", "🔔"], ["あわのうみ", "🫧"], ["ぬいぐるみパーク", "🧸"],
      ["ダンスフロア", "🪩"], ["クローズアップ", "📷"], ["アンコールばし", "🌈"], ["いろがみステージ", "📄"], ["まちあわせルーム", "🚪"],
      ["ミラクルリボン", "🎗️"], ["タルトのおみせ", "🥧"], ["おひさまステージ", "☀️"], ["ゆめのカーテン", "🌙"], ["ファイナルライブ", "🏆"]
    ],
    kakkoii: [
      ["きょうりゅうや", "🦕"], ["ぶきや", "⚔️"], ["ぼうぐや", "🛡️"], ["くつや", "👟"], ["はなびや", "🎆"], ["ロボットや", "🤖"],
      ["きょうりゅうパーク", "🦖"], ["ソードショップ", "🗡️"], ["シールドや", "🔰"], ["スパイクや", "⚽"], ["ロケットはなび", "🚀"], ["メカや", "⚙️"],
      ["ほねや", "🦴"], ["まほうのぶきや", "🔮"], ["よろいや", "🪖"], ["スピードくつや", "💨"], ["うちゅうはなび", "🌌"], ["ヒーローや", "🦸"],
      ["たにのきょうりゅう", "🌋"], ["かげのぶきや", "🌑"], ["てつのぼうぐ", "⛓️"], ["サッカーくつや", "🥅"], ["まつりのはなび", "🎇"], ["バトルロボ", "🦾"],
      ["でかいきょうりゅう", "⭐"], ["でんせつのつるぎ", "🗡️"], ["きんのよろい", "🥇"], ["ジェットくつ", "👟"], ["スターはなび", "💥"], ["ファイナルベース", "🏁"]
    ],
    cool: [
      ["はなや", "🌷"], ["スーパー", "🛒"], ["さかなや", "🐟"], ["コンビニ", "🏪"], ["パンや", "🍞"], ["ほんや", "📚"],
      ["フラワーショップ", "💐"], ["食品かん", "🥬"], ["鮮魚コーナー", "🦐"], ["駅前コンビニ", "🌃"], ["ベーカリー", "🥐"], ["書店", "📖"],
      ["お花市場", "🌼"], ["青果や", "🍎"], ["干物や", "🐠"], ["よるのコンビニ", "💡"], ["サンドイッチや", "🥪"], ["雑誌コーナー", "📰"],
      ["公園売店", "🌳"], ["マーケット", "🛍️"], ["海鮮や", "🦑"], ["24じかんショップ", "🕐"], ["モーニングパン", "☕"], ["文房具や", "✏️"],
      ["花のなみき", "🌺"], ["生鮮コーナー", "🥛"], ["魚市場", "⚓"], ["ドラッグストア", "💊"], ["カフェ", "🍵"], ["としょかんショップ", "🔖"]
    ]
  };
  const shopScenes = {
    kawaii: ["scene-berry", "scene-stage", "scene-cafe", "scene-forest", "scene-night", "scene-gift"],
    kakkoii: ["shop-kk-dino", "shop-kk-weapon", "shop-kk-armor", "shop-kk-shoes", "shop-kk-fire", "shop-kk-robo"],
    cool: ["shop-cl-flower", "shop-cl-super", "shop-cl-fish", "shop-cl-conveni", "shop-cl-bakery", "shop-cl-book"]
  };
  const giftScene = {
    kawaii: "scene-gift",
    kakkoii: "shop-kk-robo",
    cool: "shop-cl-flower"
  };
  const shopStories = {
    kawaii: [
      ["🧸", "大好きな人に、おもちゃを買いにいこう。"],
      ["🎤", "ライブの衣装を買って、大きな声で歌おう。"],
      ["🌸", "お母さんの誕生日に、花を買いにいこう。"],
      ["🍪", "元気のないお友だちに、おやつを届けよう。"],
      ["🐱", "子猫に、やわらかいベッドを買いにいこう。"],
      ["💌", "好きな人に、手紙とおかしを届けよう。"]
    ],
    kakkoii: [
      ["🦕", "きょうりゅうのたまごを買いにいこう。"],
      ["⚔️", "ヒーローのつるぎを買いにいこう。"],
      ["👟", "サッカーシューズをそろえにいこう。"],
      ["🎆", "はなびを買って、夜空にうちあげよう。"],
      ["🤖", "ロボットのパーツを買いにいこう。"],
      ["🛡️", "ぼうぐをそろえて、ぼうけんしよう。"]
    ],
    cool: [
      ["🌷", "花屋で花を買って、届けよう。"],
      ["🛒", "スーパーで夕飯の材料を買おう。"],
      ["🐟", "魚屋でさかなを買おう。"],
      ["🏪", "コンビニでおみやげを買おう。"],
      ["🍞", "パン屋でパンを買おう。"],
      ["📚", "本屋で本を買おう。"]
    ]
  };
  const rescuePlaces = {
    kawaii: [
      { name: "もりのいりぐち", tool: "ひかるシールド", scene: "scene-forest" },
      { name: "よるのみち", tool: "ことばのつるぎ", scene: "scene-night" },
      { name: "いちごのおか", tool: "ゆうきのブーツ", scene: "scene-berry" },
      { name: "ひみつのぶたい", tool: "まもりのホイッスル", scene: "scene-stage" },
      { name: "ともだちのいえ", tool: "きずなのハンマー", scene: "scene-gift" }
    ],
    kakkoii: [
      { name: "きょうりゅうのたに", tool: "きょうりゅうのたまご", scene: "shop-kk-dino" },
      { name: "かえんどうくつ", tool: "ほのおのつるぎ", scene: "shop-kk-fire" },
      { name: "てつのおか", tool: "てつのシールド", scene: "shop-kk-armor" },
      { name: "ロボットベース", tool: "パワーコア", scene: "shop-kk-robo" },
      { name: "ひみつきち", tool: "きずなのコンパス", scene: "shop-kk-weapon" }
    ],
    cool: [
      { name: "こうえん", tool: "かぜのぼうし", scene: "shop-cl-flower" },
      { name: "よるのまち", tool: "まちのライト", scene: "shop-cl-conveni" },
      { name: "えきまえ", tool: "きっぷいれ", scene: "shop-cl-super" },
      { name: "おみせどおり", tool: "かいものぶくろ", scene: "shop-cl-book" },
      { name: "ともだちのいえ", tool: "あいずのキー", scene: "shop-cl-bakery" }
    ]
  };

  global.KiramekiWorld = {
    charasByTaste, allCharas, charIdsByTaste, allCharIds, defaultNames,
    defaultPlayer, defaultFriend, shopPlaces, shopScenes, giftScene, shopStories, rescuePlaces
  };
})(window);
