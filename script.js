var state = "KY";

function init() {

    var map = L.map("map").setView([40,-98], 4);
    var layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    var dt;
    var currdata;

    $(window).resize(function(){ 
        windowsize();
    });

    $.getJSON("https://covidtracking.com/api/states", function(response) {
        $.each(statedata, function(i) {
            var currcount = response.find(x => x.state === statedata[i]["state"])["positive"];
            var iconsz = iconsize(currcount);
            L.marker([statedata[i]["latitude"], statedata[i]["longitude"]], {icon: 
                L.icon({
                    iconUrl: 'circle.svg',
                    iconSize: [iconsz, iconsz]
                })
            }).on('click', function(e) {
                state = statedata[i]["state"];
                display();
            }).addTo(map);
            currdata = response.find(x => x.state === statedata[i]["state"]);
            $("#table tbody").append(
                 '<tr onclick="tableclick(\''+statedata[i]["state"]+'\')">'
                +'<td>0</td>'
                +'<td>'+statedata[i]["state"]+'</td>'
                +'<td>'+statedata[i]["pop"]+'</td>'
                +'<td>'+currdata["positive"]+'</td>'
                +'<td>'+currdata["totalTestResults"]+'</td>'
                +'<td>'+currdata["death"]+'</td>'
                +'<td>'+(currdata["positive"]/statedata[i]["pop"])*1000+'</td>'
                +'<td>'+(currdata["totalTestResults"]/statedata[i]["pop"])*1000+'</td>'
                +'<td>'+(currdata["death"]/statedata[i]["pop"])*1000+'</td>'
                +'</tr>'
            );
        });

        dt = $('#table').DataTable({
              paging: false
             ,searching: false
             ,info: false
             ,columns: [
                {render: $.fn.dataTable.render.number(",",".")}
                 ,null
                 ,{render: $.fn.dataTable.render.number(",",".")}
                 ,{render: $.fn.dataTable.render.number(",",".")}
                 ,{render: $.fn.dataTable.render.number(",",".")}
                 ,{render: $.fn.dataTable.render.number(",",".")}
                 ,{render: $.fn.dataTable.render.number(",",".",3)}
                 ,{render: $.fn.dataTable.render.number(",",".",3)}
                 ,{render: $.fn.dataTable.render.number(",",".",3)}
             ]
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

function tableclick(s) {
    state = s;
    display();
}

function windowsize() {
    $('#bottom').css('height', $(window).height() - 400 - 2);
}

function iconsize(count) {
    var e = 6;
    var i = 0;
    var currvalue = count / e;
    while (currvalue > e) {
        i++;
        currvalue = currvalue/e;
    }
    return 2+(e*i);
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
                ,"doublerate": 0
                ,"tests": response[i]["totalTestResults"]
                ,"deaths": response[i]["death"]
            });
        });

        data = data.reverse();


        for (var i=0; i < data.length; i++) {

            // sevenday
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

            // doublerate
            var remainder = data[i]["total"]*2;
            var j = 0.0;
            while (i-j > -1) {
                if (remainder - data[i-j]["total"] > 0) {
                    remainder = remainder - data[i-j]["total"];
                    j += 1.0;
                }
                else {
                    j += remainder / data[i-j]["total"];
                    break;
                }
            }
            data[i]["doublerate"] = j;

        }

        $.each(data, function(i) {
            datax.push(data[i]["date"]);
            datay.push(data[i][$("#measure").val()]);
        });

        var plot = document.getElementById('display');
        var plottype = "scatter";

        if ($("#measure").val() == "new") {
            plottype = "bar";
        }

        Plotly.newPlot(plot
            ,[{
                 x: datax
                ,y: datay
                ,type: plottype
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