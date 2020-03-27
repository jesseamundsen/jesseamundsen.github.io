function init() {

    var map = L.map("map").setView([40,-98], 4);
    var layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

    $.getJSON("https://covidtracking.com/api/states", function(response) {
        $.each(data, function(i) {
            var currcount = response.find(x => x.state === data[i]["state"])["positive"];
            var iconsz = iconsize(currcount);
            L.marker([data[i]["latitude"], data[i]["longitude"]], {icon: 
                L.icon({
                    iconUrl: 'circle.svg',
                    iconSize: [iconsz, iconsz]
                })
            }).on('click', function(e) {
                display(data[i]["state"]);
            }).addTo(map);
        })
    });

}

function iconsize(count) {
    var i  = 0;
    var currvalue = count / 2;
    while (currvalue > 2) {
        i++;
        currvalue = currvalue/2;
    }
    return 2+(2*i);
}

function display(state) {
    $.getJSON("https://covidtracking.com/api/states/daily?state=" + state, function(response) {
        var datax = [];
        var datay = [];    
        $.each(response, function(i) {
            datax.push(response[i]["date"].toString().slice(0,4)+"-"+response[i]["date"].toString().slice(4,6)+"-"+response[i]["date"].toString().slice(6,8));
            datay.push(response[i][$("#measure").val()]);
        });
        var plot = document.getElementById('display');
        Plotly.newPlot(plot
            ,[{
                 x: datax
                ,y: datay
             }]
            ,{
                 margin:{t:0}
            }
        );
    });
}