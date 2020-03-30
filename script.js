var state = "KY";

function init() {

    var map = L.map("map").setView([40,-98], 4);
    var layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    var dt;

    $(window).resize(function(){ 
        windowsize();
    });

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
                state = data[i]["state"];
                display();
            }).addTo(map);
            $("#table tbody").append(
                 '<tr>'
                +'<td>0</td>'
                +'<td>'+data[i]["state"]+'</td>'
                +'<td>'+data[i]["pop"]+'</td>'
                +'<td>'+response.find(x => x.state === data[i]["state"])["positive"]+'</td>'
                +'<td>'+response.find(x => x.state === data[i]["state"])["totalTestResults"]+'</td>'
                +'<td>'+response.find(x => x.state === data[i]["state"])["death"]+'</td>'
                +'<td>'+round((response.find(x => x.state === data[i]["state"])["positive"]/data[i]["pop"])*1000)+'</td>'
                +'<td>'+round((response.find(x => x.state === data[i]["state"])["totalTestResults"]/data[i]["pop"])*1000)+'</td>'
                +'<td>'+round((response.find(x => x.state === data[i]["state"])["death"]/data[i]["pop"])*1000)+'</td>'
                +'</tr>'
            );
        });

        dt = $('#table').DataTable({
             paging: false
        });

        dt.on('order.dt search.dt', function(){
            dt.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
                cell.innerHTML = i+1;
            });
        } ).draw();

        windowsize();

        $('#tablewrapper').show();

        display();

        $("#measure").change(display);

    });

}

function windowsize() {
    $('#bottom').css('height', $(window).height() - 400 - 2);
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

function round(v) {
    return (Math.round(v*1000)/1000).toFixed(3);
}

function display() {

    $("#currentstate").html(state);

    $.getJSON("https://covidtracking.com/api/states/daily?state=" + state, function(response) {

        var data = [];
        var datax = [];
        var datay = [];
        var sevenday;

        $.each(response, function(i) {
            data.push({
                "date": response[i]["date"].toString().slice(0,4)+"-"+response[i]["date"].toString().slice(4,6)+"-"+response[i]["date"].toString().slice(6,8)
                ,"total": response[i]["positive"]
                ,"new": response[i]["positiveIncrease"]
                ,"sevenday": 0
                ,"tests": response[i]["totalTestResults"]
                ,"deaths": response[i]["death"]
            });
        });

        data = data.reverse();

        for (var i=0; i < data.length; i++) {
            sevenday = 0;
            for (var j=0; j < 7; j++) {
                if (i-j == 0) {
                    break;
                }
                else {
                    sevenday += data[i-j]["new"];
                }
            }
            data[i]["sevenday"] = sevenday;
        }

        $.each(data, function(i) {
            datax.push(data[i]["date"]);
            datay.push(data[i][$("#measure").val()]);
        });

        var plot = document.getElementById('display');
        Plotly.newPlot(plot
            ,[{
                 x: datax
                ,y: datay
             }],
             {margin: {
                t: 40
                ,b: 40
                ,r: 40
                ,l: 40
              }
            }
            ,{displayModeBar: false}
        );

    });

    $("#plotwrapper").show();

}