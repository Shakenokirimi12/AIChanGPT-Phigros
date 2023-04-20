//セキュリティーのためアクセスキーなどは削除しています。
function getService() {
  pkceChallengeVerifier();
  const userProps = PropertiesService.getUserProperties();
  const scriptProps = PropertiesService.getScriptProperties();
  return OAuth2.createService('twitter')
    .setAuthorizationBaseUrl('https://twitter.com/i/oauth2/authorize')
    .setTokenUrl('https://api.twitter.com/2/oauth2/token?code_verifier=' + userProps.getProperty("code_verifier"))
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setCallbackFunction('authCallback')
    .setPropertyStore(userProps)
    .setScope('users.read tweet.read tweet.write offline.access')
    .setParam('response_type', 'code')
    .setParam('code_challenge_method', 'S256')
    .setParam('code_challenge', userProps.getProperty("code_challenge"))
    .setTokenHeaders({
      'Authorization': 'Basic ' + Utilities.base64Encode(CLIENT_ID + ':' + CLIENT_SECRET),
      'Content-Type': 'application/x-www-form-urlencoded'
    })
}

function authCallback(request) {
  const service = getService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}

function pkceChallengeVerifier() {
  var userProps = PropertiesService.getUserProperties();
  if (!userProps.getProperty("code_verifier")) {
    var verifier = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

    for (var i = 0; i < 128; i++) {
      verifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    var sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier)

    var challenge = Utilities.base64Encode(sha256Hash)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    userProps.setProperty("code_verifier", verifier)
    userProps.setProperty("code_challenge", challenge)
  }
}

function logRedirectUri() {
  var service = getService();
  Logger.log(service.getRedirectUri());
}

function main() {
  const service = getService();
  if (service.hasAccess()) {
    Logger.log("Already authorized");
  } else {
    const authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
}


function setrecommendsong() {
  //スクリプトプロパティに設定したOpenAIのAPIキーを取得
  //ChatGPTのAPIのエンドポイントを設定
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  //ChatGPTに投げるメッセージを定義(過去のやり取りも含めた形)
  var todayssong = randomsong();
  var messages = [
    {
      "role": "system", "content": `
これから、あなたは音楽ゲーム「Phigros」に登場するAIのキャラクターAI-Chanとして返答を行ってください。
AI-Chanの発言としては以下のような口調、内容があげられますので、以下を参考に、発言を行ってください。
*プレイする曲に迷っているなら、この曲がお勧めです。
*Rrharilという曲は、適度な難易度で初心者でも楽しめます。
*Phigrosは完全無料で、初心者でも楽しめる素晴らしい音ゲーです。
また、お勧めの曲を聞かれた場合、以下の曲を使用してください、
        `+ "\n" + todayssong
    }
  ];
  messages.push({ "role": "user", "content": "プレイする曲を決めかねています。お勧めの曲を教えてください。" })
  //OpenAIのAPIリクエストに必要なヘッダー情報を設定
  const headers = {
    'Authorization': 'Bearer ' + OPENAI_APIKEY,
    'Content-type': 'application/json',
  };
  //ChatGPTモデルやトークン上限、プロンプトをオプションに設定
  const options = {
    'muteHttpExceptions': true,
    'headers': headers,
    'method': 'POST',
    'payload': JSON.stringify({
      'model': 'gpt-3.5-turbo',
      'messages': messages
    })
  };
  //OpenAIのChatGPTにAPIリクエストを送り、結果を変数に格納
  const response = JSON.parse(UrlFetchApp.fetch(apiUrl, options).getContentText());
  //ChatGPTのAPIレスポンスをログ出力
  return response.choices[0].message.content;
}


function starttweeting() {
  var tweetstring = setrecommendsong()
  sendTweet("Q.「お勧めの曲は？」"+ "\n" + "A.「" + tweetstring + "」");
}

function sendTweet(tweetstring) {
  var payload = {
    text: tweetstring
  }

  var service = getService();
  if (service.hasAccess()) {
    var url = `https://api.twitter.com/2/tweets`;
    var response = UrlFetchApp.fetch(url, {
      method: 'POST',
      'contentType': 'application/json',
      headers: {
        Authorization: 'Bearer ' + service.getAccessToken()
      },
      muteHttpExceptions: true,
      payload: JSON.stringify(payload)
    });
    var result = JSON.parse(response.getContentText());
    Logger.log(JSON.stringify(result, null, 2));
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
}

function randomsong() {
  var spreadSheet = SpreadsheetApp.openByUrl(SHEET_URL);
  var sheet = spreadSheet.getSheetByName("songs");
  var range = sheet.getRange("A2:B" + sheet.getLastRow()); // リストがある範囲を選択
  var values = range.getValues();
  var randomIndex = Math.floor(Math.random() * values.length);
  var song = values[randomIndex][0]; // 1列目の値を取得
  var artist = values[randomIndex][1]; // 2列目の値を取得
  console.log(song)
  console.log(artist)
  return song + "  by" + artist
}