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
  const customCharas = [
    { id: "my1", name: "じぶん1", trait: "写真を入れて名前をつけてね。", custom: true },
    { id: "my2", name: "じぶん2", trait: "写真を入れて名前をつけてね。", custom: true }
  ];
  const customCharIds = customCharas.map((c) => c.id);
  const charIdsByTaste = {
    kawaii: charasByTaste.kawaii.map((c) => c.id),
    kakkoii: charasByTaste.kakkoii.map((c) => c.id),
    cool: charasByTaste.cool.map((c) => c.id)
  };
  const allCharIds = allCharas.map((c) => c.id);
  const defaultNames = {};
  allCharas.forEach((c) => { defaultNames[c.id] = c.name; });
  customCharas.forEach((c) => { defaultNames[c.id] = c.name; });

  const shopPlaces = {
    kawaii: [
      ["いちごのおか", "🍓", "いちご"], ["リボンステージ", "🎀", "リボン"], ["ハートカフェ", "💗", "ハート"], ["きらめきドーム", "✨", "きらめき"], ["おはなのひろば", "🌸", "おはな"],
      ["みみのもり", "🐰", "みみ"], ["キャンディどおり", "🍬", "キャンディ"], ["ほしのへや", "⭐", "ほし"], ["ピンクのはし", "🌉", "はし"], ["うたのひろば", "🎤", "うた"],
      ["レースのには", "🌷", "レース"], ["マカロンやま", "🍪", "マカロン"], ["きらきらどおり", "💎", "きらきら"], ["おどりのへや", "💃", "おどり"], ["おてがみポスト", "💌", "おてがみ"],
      ["ライトステージ", "💡", "ライト"], ["さくらんぼざか", "🍒", "さくらんぼ"], ["ベルのとう", "🔔", "ベル"], ["あわのうみ", "🫧", "あわ"], ["ぬいぐるみパーク", "🧸", "ぬいぐるみ"],
      ["ダンスフロア", "🪩", "ダンス"], ["クローズアップ", "📷", "カメラ"], ["アンコールばし", "🌈", "にじ"], ["いろがみステージ", "📄", "いろがみ"], ["まちあわせルーム", "🚪", "ドア"],
      ["ミラクルリボン", "🎗️", "リボン"], ["タルトのおみせ", "🥧", "タルト"], ["おひさまステージ", "☀️", "おひさま"], ["ゆめのカーテン", "🌙", "ゆめ"], ["ファイナルライブ", "🏆", "トロフィー"]
    ],
    kakkoii: [
      ["きょうりゅうや", "🦕", "きょうりゅう"], ["ぶきや", "⚔️", "つるぎ"], ["ぼうぐや", "🛡️", "たて"], ["くつや", "👟", "くつ"], ["はなびや", "🎆", "はなび"], ["ロボットや", "🤖", "ロボット"],
      ["きょうりゅうパーク", "🦖", "きょうりゅう"], ["ソードショップ", "🗡️", "ソード"], ["シールドや", "🔰", "シールド"], ["スパイクや", "⚽", "ボール"], ["ロケットはなび", "🚀", "ロケット"], ["メカや", "⚙️", "メカ"],
      ["ほねや", "🦴", "ほね"], ["まほうのぶきや", "🔮", "まほう"], ["よろいや", "🪖", "よろい"], ["スピードくつや", "💨", "スピード"], ["うちゅうはなび", "🌌", "うちゅう"], ["ヒーローや", "🦸", "ヒーロー"],
      ["たにのきょうりゅう", "🌋", "たまご"], ["かげのぶきや", "🌑", "かげ"], ["てつのぼうぐ", "⛓️", "てつ"], ["サッカーくつや", "🥅", "ゴール"], ["まつりのはなび", "🎇", "はなび"], ["バトルロボ", "🦾", "アーム"],
      ["でかいきょうりゅう", "⭐", "スター"], ["でんせつのつるぎ", "🗡️", "つるぎ"], ["きんのよろい", "🥇", "きんメダル"], ["ジェットくつ", "👟", "ジェット"], ["スターはなび", "💥", "ばくはつ"], ["ファイナルベース", "🏁", "フラッグ"]
    ],
    cool: [
      ["はなや", "🌷", "おはな"], ["スーパー", "🍎", "りんご"], ["さかなや", "🐟", "さかな"], ["コンビニ", "🍙", "おにぎり"], ["パンや", "🍞", "パン"], ["ほんや", "📚", "ほん"],
      ["フラワーショップ", "💐", "ブーケ"], ["食品かん", "🥬", "やさい"], ["鮮魚コーナー", "🦐", "えび"], ["駅前コンビニ", "🎫", "きっぷ"], ["ベーカリー", "🥐", "クロワッサン"], ["書店", "📖", "ほん"],
      ["お花市場", "🌼", "おはな"], ["青果や", "🍎", "りんご"], ["干物や", "🐠", "ひもの"], ["よるのコンビニ", "🪙", "コイン"], ["サンドイッチや", "🥪", "サンド"], ["雑誌コーナー", "📰", "ざっし"],
      ["公園売店", "🌰", "どんぐり"], ["マーケット", "🛍️", "ふくろ"], ["海鮮や", "🦑", "いか"], ["24じかんショップ", "🕐", "とけい"], ["モーニングパン", "☕", "コーヒー"], ["文房具や", "✏️", "えんぴつ"],
      ["花のなみき", "🌺", "おはな"], ["生鮮コーナー", "🥛", "ぎゅうにゅう"], ["魚市場", "⚓", "いかり"], ["ドラッグストア", "💊", "くすり"], ["カフェ", "🍵", "お茶"], ["としょかんショップ", "🔖", "しおり"]
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
      { name: "もりのいりぐち", tool: "ひかるシールド", scene: "scene-forest", mark: "🌰" },
      { name: "よるのみち", tool: "ことばのつるぎ", scene: "scene-night", mark: "🪙" },
      { name: "いちごのおか", tool: "ゆうきのブーツ", scene: "scene-berry", mark: "🍓" },
      { name: "ひみつのぶたい", tool: "まもりのホイッスル", scene: "scene-stage", mark: "🎤" },
      { name: "ともだちのいえ", tool: "きずなのハンマー", scene: "scene-gift", mark: "🔑" }
    ],
    kakkoii: [
      { name: "きょうりゅうのたに", tool: "きょうりゅうのたまご", scene: "shop-kk-dino", mark: "🥚" },
      { name: "かえんどうくつ", tool: "ほのおのつるぎ", scene: "shop-kk-fire", mark: "🔥" },
      { name: "てつのおか", tool: "てつのシールド", scene: "shop-kk-armor", mark: "🛡️" },
      { name: "ロボットベース", tool: "パワーコア", scene: "shop-kk-robo", mark: "⚡" },
      { name: "ひみつきち", tool: "きずなのコンパス", scene: "shop-kk-weapon", mark: "⭐" }
    ],
    cool: [
      { name: "こうえん", tool: "かぜのぼうし", scene: "shop-cl-flower", mark: "🍃" },
      { name: "よるのまち", tool: "まちのライト", scene: "shop-cl-conveni", mark: "🪙" },
      { name: "えきまえ", tool: "きっぷいれ", scene: "shop-cl-super", mark: "🎫" },
      { name: "おみせどおり", tool: "かいものぶくろ", scene: "shop-cl-book", mark: "🛍️" },
      { name: "ともだちのいえ", tool: "あいずのキー", scene: "shop-cl-bakery", mark: "🔑" }
    ]
  };
  const rescueCheers = ["その調子！", "いい感じ！", "そのちょうしだ！"];

  global.KiramekiWorld = {
    charasByTaste, allCharas, customCharas, customCharIds, charIdsByTaste, allCharIds, defaultNames,
    defaultPlayer, defaultFriend, shopPlaces, shopScenes, giftScene, shopStories, rescuePlaces, rescueCheers
  };
})(window);
