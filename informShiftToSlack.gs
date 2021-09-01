var POST_URL = '';//incoming webhook url
var numMaxRow = 24;//getMaxRows() is also fine, but the area of spreadsheet may be changed each time it is created.//global variable

function checkMember(person){
  var members = {'名字':'slack-user-name','名字':'slack-user-name'}//slack-user-name is neither fullname nor displayname //find out on "Manage members" page of slack

  if(members[person]!= null){
    return members[person];
  }
  else{
    return false;
  }
}


function fetchPassList(sheet,numMaxRow,numMaxColumn){

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
  }
  return passList;
}


function createPassAvailabilityList(sheet,numMaxRow,numMaxColumn){

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
  return passJudgeList
}


function fetchShiftList(sheet,numMaxRow,numMaxColumn,numMaxMember){
  //var tmpShiftList = sheetOperator.getRange(1,1,numMaxRow,numMaxColumn).getValues();
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
      
      if(rowIndex%numMaxMember == 0){
        tmpOneDay.push(tmpOnePass);
        tmpOnePass = [];
      }  

      if(!tmpOnePass.length){
        continue;
      }    
    }
    shiftList.push(tmpOneDay);
  }
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
  var ss = SpreadsheetApp.openByUrl(''); //shift spreadsheet url
  var sheetOperator = ss.getSheetByName("従事者シフト");
  var sheetResponsibleOperator = ss.getSheetByName("責任者シフト");

  var numMaxColumn = sheetOperator.getMaxColumns();

  var passList = fetchPassList(sheetOperator,numMaxRow,numMaxColumn, 3);
  var passJudgeList = createPassAvailabilityList(sheetOperator,numMaxRow,numMaxColumn, 3);
  var shiftOperator = fetchShiftList(sheetOperator,numMaxRow,numMaxColumn, 3);
  var shiftResponsibleOperator = fetchShiftList(sheetResponsibleOperator,numMaxRow,numMaxColumn,3);

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

  //dayIndex=1;
  var message = "――――　パス情報　"+ Utilities.formatDate(passList[dayIndex][i], "JST", "M/dd (E)") +"～　――――\n";
  for(var i=0; i<passList[dayIndex].length; i++){
    if(passJudgeList[dayIndex][i] == true){
      message += Utilities.formatDate(passList[dayIndex][i], "JST", "HH:mm") + "："+ "\n";
      message += "従事者：　"
      for(j=0;j<shiftOperator[dayIndex][i].length;j++){
        message +=" <@" + shiftOperator[dayIndex][i][j] + ">";
      }
      message += "\n責任者：　"
      for(j=0;j<shiftResponsibleOperator[dayIndex][i].length;j++){
        message +=" <@" + shiftResponsibleOperator[dayIndex][i][j] + ">";
      }
      message += "\n------------------------------------------------------\n";
    }
    else if(passJudgeList[dayIndex][i] == false){
      message += Utilities.formatDate(passList[dayIndex][i], "JST", "HH:mm")+ "：　運用なし" + "\n------------------------------------------------------\n";
      //message +=
    }
    else{
      message = "異常"
      return message;
    }
    
  }
  message += "\n<|運用従事者(6/14~6/20)>";//fill out url at the left side of "|" to create Link format in Slack
  message += "\n<|運用責任者(6/14~6/20)>";//fill out url at the left side of "|" to create Link format in Slack
  
  Logger.log(message);

  postToSlack(message);

}


function setTrigger(){
  var triggerTime = new Date();
  var ss = SpreadsheetApp.openByUrl('');//spreadsheet url
  var sheetOperator = ss.getSheetByName("従事者シフト");
  var numMaxColumn = sheetOperator.getMaxColumns();
  var passList = fetchPassList(sheetOperator,numMaxRow,numMaxColumn, 3);
  var passJudgeList = createPassAvailabilityList(sheetOperator,numMaxRow,numMaxColumn, 3);

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
