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
                display(data[i]["state"]
                    ,response.find(x => x.state === data[i]["state"])["positive"]
                    ,response.find(x => x.state === data[i]["state"])["totalTestResults"]
                    ,response.find(x => x.state === data[i]["state"])["death"]
                    );
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

function display(state, cases, tests, deaths) {
    $("#table tbody").html('').append('<tr><td>'+state+'</td><td>'+cases+'</td><td>'+tests+'</td><td>'+deaths+'</td></tr>');
    $.getJSON("https://covidtracking.com/api/states/daily?state=" + state, function(response) {
        var datax = [];
        var datay_cases = [];
        var datay_tests = [];
        var datay_deaths = [];
        $.each(response, function(i) {
            datax.push(response[i]["date"].toString().slice(0,4)+"-"+response[i]["date"].toString().slice(4,6)+"-"+response[i]["date"].toString().slice(6,8));
            datay_cases.push(response[i]["positive"]);
            datay_tests.push(response[i]["totalTestResults"]);
            datay_deaths.push(response[i]["death"]);
        });

        var plot_cases = document.getElementById('display_cases');
        Plotly.newPlot(plot_cases
            ,[{
                 x: datax
                ,y: datay_cases
             }]
            ,{title: {text: "Cases"}}
        );

        var plot_tests = document.getElementById('display_tests');
        Plotly.newPlot(plot_tests
            ,[{
                 x: datax
                ,y: datay_tests
             }]
            ,{title: {text: "Tests"}}
        );

        var plot_deaths = document.getElementById('display_deaths');
        Plotly.newPlot(plot_deaths
            ,[{
                 x: datax
                ,y: datay_deaths
             }]
             ,{title: {text: "Deaths"}}
        );

    });
    $("#hidden").show();
}