var state = "KY";

function init() {

    var map = L.map("map").setView([40,-98], 4);
    var layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    var dt;
    var currdata;

    $(window).resize(function(){ 
        windowsize();
    });

    $.each(statedata, function(i) { 
        var iconsz = iconsize(0);
                L.marker([statedata[i]["latitude"], statedata[i]["longitude"]], {icon: 
                    L.icon({
                        iconUrl: 'circle.svg',
                        iconSize: [iconsz, iconsz]
                    })
                }).on('click', function(e) {
                    state = statedata[i]["state"];
                    display();
                }).addTo(map);
    });

    windowsize();

    $('#tablewrapper').show();

    display();

    $("#measure").change(function() {display();});
    $("#axistype").change(function() {display();});
    $("#days").change(function() {display();});

    /*$.getJSON("https://api.covidtracking.com/v1/states/current.json", function(response) {
        $.each(statedata, function(i) {
            if (statedata[i]["state"]!="US") {
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
            }
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

        $("#measure").change(function() {display();});
        $("#axistype").change(function() {display();});
        $("#days").change(function() {display();});

    });*/

}

function tableclick(s) {
    state = s;
    display();
}

function windowsize() {
    $('#bottom').css('height', $(window).height() - 400 - 2);
}

function iconsize(count) {
    /*var e = 6;
    var i = 0;
    var currvalue = count / e;
    while (currvalue > e) {
        i++;
        currvalue = currvalue/e;
    }
    if (i>10) {
        i = 10;
    }
    return e+Math.pow(2,i);*/
    return 12;
}

function pct(n,t) {
    var v = n/t;
    if (v==1) {
        return 0;
    }
    else
    {
        return v;
    }
}

function display() {

    $("#currentstate").html(state);

    var uri = "https://api.covidactnow.org/v2/state/"+state.toUpperCase()+".timeseries.json?apiKey=1d11165a0ab845768de95300f6cdc7ba";

    $.getJSON(uri, function(r) {

        var data = [];
        var datax = [];
        var datay = [];
        var response;

        $.each(r["actualsTimeseries"], function(i) {
            response = r["actualsTimeseries"];
            if (response[i]["newCases"] != null)
            {
                data.push({
                    "date": response[i]["date"]
                    ,"allcases": response[i]["cases"]
                    ,"alldeaths": response[i]["deaths"]
                    ,"newcases": response[i]["newCases"]
                    ,"newdeaths": response[i]["newDeaths"]
                });
            }
        });

        if (data.length > $('#days').val()) {
            data = data.slice(data.length - $('#days').val());
        }
        $.each(data, function(i) {
            datax.push(data[i]["date"]);
            datay.push(fixvalue(data[i][$("#measure").val()]));        
        });

        var plot = document.getElementById('display');
        var plotdata = [];

        // look if trace exists
        if (plot.data) {
            var i = plot.data.findIndex(x => x.name === state);
            if (i > -1) {
                plot.data.splice(i, 1);
            }
        }

        if ($("#measure").val().substring(0,3) == "new") {
            plotdata = [{
                name: state
                ,x: datax
                ,y: datay
                ,type: 'bar'
            },
            {
                name: 'Average'
                ,x: datax
                ,y: avg(datay,7)
                ,type: 'scatter'
                ,line: {shape: 'spline', smoothing: 1.3}
            }];
        }
        else {
            plotdata = [{
                name: state
                ,x: datax
                ,y: datay
            }];
        }

        Plotly.newPlot(plot
            ,plotdata
            ,{margin: {
                t: 40
                ,b: 40
                ,r: 40
                ,l: 40
                },
                yaxis: {type: $("#axistype").val()}
            }
            ,{displayModeBar: false}
        );

    });

    $("#plotwrapper").show();

}

function fixvalue(v) {
    var r = 0;
    if (v > 0) {
        r = v;
    }
    return r;
}

function avg(data, series) {
    var avgdata = [];
    for (var i=0; i < data.length; i++) {
        v = 0;
        for (var j=0; j < series; j++) {
            if (i-j == 0) {
                break;
            }
            else {
                v += data[i-j];
            }
        }
        avgdata.push(v / series);
    }
    return avgdata;
}