var POST_URL = '';//incoming webhook url
var SHIFT_SPREADSHEET_URL = '';// shift spread sheet URL
var NUM_MAX_OPERATORS_INTEGRATED = 4; // the number of operators


function checkMember(person){
  var members = {'名字':'slack-user-name','名字':'slack-user-name'}//slack-user-name is neither fullname nor displayname //find out on "Manage members" page of slack

  if(members[person]!= null){
    return members[person];
  }
  else{
    return false;
  }
}

function fetchPassList(sheet,numMaxColumn, numMaxMember){

  var numMaxRow = 1+ (1+numMaxMember)*8;
  var tmpPassList = sheet.getRange(1,1,numMaxRow,numMaxColumn).getValues();
  var passList = []

  for(var columnIndex=0; columnIndex < numMaxColumn;columnIndex++){
    
    var tmpSeriesPass = [];

    for(var rowIndex=0; rowIndex<numMaxRow; rowIndex++){
      if(typeof(tmpPassList[rowIndex][columnIndex])== "object"){
        tmpSeriesPass.push(tmpPassList[rowIndex][columnIndex]);
      }
    }
    if(!tmpSeriesPass.length){
      continue;
    }
    passList.push(tmpSeriesPass);
    //Logger.log(tmpSeriesPass);
  }
  
  return passList;
}


function createPassAvailabilityList(sheet,numMaxColumn, numMaxMember){

  var numMaxRow = 1+ (1+numMaxMember)*8;
  var tmpPassList = sheet.getRange(1,1,numMaxRow,numMaxColumn).getValues();
  var passJudgeList = []

  for(var columnIndex=0; columnIndex < numMaxColumn;columnIndex++){
    
    var tmpSeriesPass = [];
    var tmpJudge = [];

    for(var rowIndex=0; rowIndex<numMaxRow; rowIndex++){
      if(typeof(tmpPassList[rowIndex][columnIndex])== "object"){
        if(checkMember(tmpPassList[rowIndex][columnIndex+1])!==false){
          tmpJudge.push(true);
        }
        else{
          tmpJudge.push(false);
        }
      }
    }
    if(!tmpJudge.length){
      continue;
    }
    passJudgeList.push(tmpJudge)
  }
  //Logger.log(passJudgeList);
  return passJudgeList
}

function fetchShiftList(sheet,numMaxColumn,numMaxMember){
  
  var numMaxRow = 1+ (1+numMaxMember)*8; //each group of passes has up to 8 passes
  var tmpShiftList =sheet.getRange(1,1,numMaxRow,numMaxColumn).getValues();
  var shiftList = [];

  for(var columnIndex=0; columnIndex < numMaxColumn;columnIndex++){
    var tmpOneDay = [];
    var tmpOnePass = [];

    if(columnIndex%2 == 0){
      continue;
    }

    for(var rowIndex=1; rowIndex<numMaxRow; rowIndex++){
    
      if(checkMember(tmpShiftList[rowIndex][columnIndex]) !== false){
        tmpOnePass.push(checkMember(tmpShiftList[rowIndex][columnIndex]));
      }
      
      if(rowIndex%(numMaxMember+1) == 0){
        tmpOneDay.push(tmpOnePass);
        tmpOnePass = [];
      }  

      if(!tmpOnePass.length){
        continue;
      }    
    }
    shiftList.push(tmpOneDay);
  }
  //Logger.log(shiftList);
  return shiftList;
}



function postToSlack(message){

  var jsonData =
  {
     "username" : 'shift-information',  // 通知時に表示されるユーザー名
     "icon_emoji": ':duck:',  // 通知時に表示されるアイコン,
     "text" : message
  };
  var payload = JSON.stringify(jsonData);

  var options =
  {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : payload
  };

  UrlFetchApp.fetch(POST_URL, options);
  
  return '';
}


function informShift() {
  var ss = SpreadsheetApp.openByUrl(SHIFT_SPREADSHEET_URL);
  var sheet = ss.getSheetByName("全体");
  var numMaxColumn = sheet.getMaxColumns();


  var passList = fetchPassList(sheet,numMaxColumn, NUM_MAX_OPERATORS_INTEGRATED);
  var passJudgeList = createPassAvailabilityList(sheet,numMaxColumn, NUM_MAX_OPERATORS_INTEGRATED);
  var shiftOperators = fetchShiftList(sheet,numMaxColumn, NUM_MAX_OPERATORS_INTEGRATED);

  var numStringList = ['①', '②', '③', '④', '➄', '⑥', '⑦', '⑧']; //which pass of a series of passes

  var presentTime = new Date();
  var dayIndex = 0;

  for(var i=0; i<passList.length;i++){
    if( passList[i][0] < presentTime && presentTime < passList[i+1][0]){
      dayIndex = i+1;
      break;
    }
    else if(presentTime < passList[0][0]){
      dayIndex = 0;
      break;
    }
  }
  
  //dayIndex=3;//for debug //regardless of presentTime
  var message = "\n―――――― " + Utilities.formatDate(passList[dayIndex][0], "JST", "M/dd (E)") + " ――――――\n";
  
  for(var i=0; i<passList[dayIndex].length; i++){

    if(passJudgeList[dayIndex][i] == true){

      message += numStringList[i] + " " + Utilities.formatDate(passList[dayIndex][i], "JST", "HH:mm") + "："+ "\n";

      message += "担当者：　"
      for(j=0;j<shiftOperators[dayIndex][i].length;j++){
        message +=" <@" + shiftOperators[dayIndex][i][j] + ">";
      }


      if(i != passList[dayIndex].length-1){
        if(passList[dayIndex][i+1].getDate() - passList[dayIndex][i].getDate() != 0){
          message += "\n―――――― " + Utilities.formatDate(passList[dayIndex][i+1], "JST", "M/dd (E)") + " ――――――\n" ;
        }
        else{
          message += "\n--------------------------------------------\n";
        }
      }
      
    }
    else if(passJudgeList[dayIndex][i] == false){
      message += numStringList[i] + " " + Utilities.formatDate(passList[dayIndex][i], "JST", "HH:mm")+ "：　運用なし" + "\n--------------------------------------------\n";
      //message +=
    }
    else{
      message = "異常"
      return message;
    }

  }
  message += "\n--------------------------------------------\n";
  message += "\n<spread sheet area URL|全体(9/5~9/12)>";
  message += "\n< handover material URL|運用方針>";
 
  
  Logger.log(message);

  postToSlack(message);

}


function setTrigger(){
  var triggerTime = new Date();
  var ss = SpreadsheetApp.openByUrl(SHIFT_SPREADSHEET_URL);
  var sheet = ss.getSheetByName("全体");
  var numMaxColumn = sheet.getMaxColumns();
  var passList = fetchPassList(sheet,numMaxColumn, 3);
  var passJudgeList = createPassAvailabilityList(sheet,numMaxColumn, NUM_MAX_OPERATORS_INTEGRATED);
  
  for(var i=0; i<passList.length;i++){
    Logger.log(i);
    Logger.log(passList[passList.length-1][0] - triggerTime);
    //delete triger //within 24h from last pass on the shift table
    if(passList[passList.length-1][0] - triggerTime < 0){
      var allTriggers = ScriptApp.getProjectTriggers();
      for (var j = 0; j < allTriggers.length; j++) {
        ScriptApp.deleteTrigger(allTriggers[j]);
      }
      Logger.log("delete all trigers");
      return '';
    }   
    else if( passList[i][0] < triggerTime && triggerTime < passList[i+1][0]){
      var executionTime = new Date(passList[i+1][0]-12*60*60*1000);
      Logger.log("trigger set complete");
      break;
    }
    else if(triggerTime < passList[0][0] && passList[0][0].getDate() - triggerTime.getDate() <= 1){
      var executionTime = new Date(passList[i][0]-12*60*60*1000);
      Logger.log("first trigger set complete");
      break;
    }
    else if(i==passList.length-1){
      Logger.log("too early");
      return '';
    }
  }
  Logger.log(executionTime);
  ScriptApp.newTrigger('informShift').timeBased().at(executionTime).create();
  
  return '';
}
