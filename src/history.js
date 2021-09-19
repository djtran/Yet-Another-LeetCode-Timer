console.log('History opened');
window.addEventListener("load", onLoadPage, false);


function onLoadPage (evt) {

    chrome.storage.local.get(['history'], function(data) {
        let history = data.history;
        console.log(JSON.stringify(history));
        let table = document.querySelector(".history-data");
        history.forEach(element => {
            let newRow = table.insertRow(-1);

            let prob = newRow.insertCell(0);
            let probLink = document.createElement('a');
            let probText = document.createTextNode(element["problem"]);
            probLink.appendChild(probText);
            probLink.title = element["problem"];
            probLink.href = element["url"]
            prob.appendChild(probLink);
            
            let diff = newRow.insertCell(1);
            let diffText = document.createTextNode(element["difficulty"]);
            diff.appendChild(diffText);

            let errors = newRow.insertCell(2);
            let errorsText = document.createTextNode(element["errors"]);
            errors.appendChild(errorsText);

            let time = newRow.insertCell(3);
            let timeText = document.createTextNode(element["successTime"]);
            time.appendChild(timeText);

            let date = newRow.insertCell(4);
            let dateText = document.createTextNode(element["date"]);
            date.appendChild(dateText);
            
        });
    });

}