(function($) {
	var maxEndDate = new Date("9999-12-31");
	var plannedEndDateField = "customfield_10051";
	var realEndDateField = "customfield_11186";
	var weekDates = [];
	
	function getDate(issue, date) {
		return (issue.fields[date] == null) ? maxEndDate : new Date(issue.fields[date]);
	}
	
	function dateToString(date) {
		return date.toLocaleDateString();
	}
	
	function getWeekNumber(date) {
		console.log("Calculating week number for date " + date.toISOString().substr(0, 10));
		// Copy date so don't modify original
		var d = new Date(+date);
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(0);
		d.setMilliseconds(0);
		// Set to nearest Thursday: current date + 4 - current day number
		// Make Sunday's day number 7
		d.setDate(d.getDate() + 4 - (d.getDay()||7));
		// Get first day of year
		var year = d.getFullYear()
		var yearStart = new Date(year,0,1);
		console.log("Reference date is " + d.toISOString().substr(0, 10) + ", year start is " + yearStart.toISOString().substr(0, 10) + " (diff = " + ((d - yearStart) / 86400000) + ")");
		// Calculate full weeks to nearest Thursday
		var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
		
		var weekStart = new Date(+d);
		weekStart.setDate(d.getDate() - 4);
		var weekEnd = new Date(+d);
		weekEnd.setDate(d.getDate() + 2);
		weekDates["S"+weekNo] = { start: weekStart, end: weekEnd };
		console.log("Week s" + weekNo + " is between " + weekStart.toISOString().substr(0, 10) + " and " + weekEnd.toISOString().substr(0, 10) + " (calculated from date " + date.toISOString().substr(0, 10) + ")");
		
		// Return array of year and week number
		return year * 100 + weekNo;
	}

	$(document).ready(function() {
		console.log("ready()");
		$.ajax({
			url: "/rest/api/latest/search?jql=project%20%3D%20currentProject()%20and%20issueType%20%3D%20Tâche%20and%20(fixVersion%20%3D%20earliestUnreleasedVersion()%20or%20fixVersion%20is%20empty)",
			contentType: "application/json",
			success: function(data) {
				var dates = [];
				var workloadExpected = [];
				var workloadReal = [];
				var workloadTarget = [];
				var workloadEntered = [];
				var size;
				
				console.log("API call executed, " + data.total + " issue(s) found");
				
				// Calcul de la charge théorique
				var issues = data.issues;
				var cumulatedWorkload = 0;
				var cumulatedWorkloadEntered = 0;
				issues.sort(function(a, b) { return getDate(a, plannedEndDateField).getTime() - getDate(b, plannedEndDateField).getTime(); });
				for (var i=0; i < data.total; i++) {
					var issue = data.issues[i];
					if (!issue) {
						break;
					}
					
					var issueEnd = getDate(issue, plannedEndDateField)
					if (issueEnd.getTime() == maxEndDate.getTime()) {
						break;
					}
					
					cumulatedWorkload += issue.fields.timeestimate;
					cumulatedWorkloadEntered += issue.fields.timespent;
					var week = getWeekNumber(issueEnd);
					if (dates.length > 0 && dates.slice(-1)[0] == week) {
						workloadExpected[workloadExpected.length-1] = Math.round(cumulatedWorkload / 3600);
						workloadEntered[workloadEntered.length-1] = Math.round(cumulatedWorkloadEntered / 3600);
					}
					else {
						while (dates.length > 0 && dates.slice(-1)[0] < (week-1)) {
							issueEnd.setDate(issueEnd.getDate() + 7);
							getWeekNumber(issueEnd); // To buffer week dates
							dates.push(dates.slice(-1)[0] + 1);
							workloadExpected.push(workloadExpected.slice(-1)[0]);
							workloadEntered.push(workloadEntered.slice(-1)[0]);
						}
						dates.push(week);
						workloadExpected.push(Math.round(cumulatedWorkload / 3600));
						workloadEntered.push(Math.round(cumulatedWorkloadEntered / 3600));
					}
					console.log("Expected workload for week " + week + ": " + Math.round(cumulatedWorkload / 3600));
					console.log("Entered workload for week " + week + ": " + Math.round(cumulatedWorkloadEntered / 3600));
				}
				
				// Suppression des toutes les entrées inutile pour la charge saisie
				while (workloadEntered.length >= 2 && workloadEntered.splice(-1)[0] == workloadEntered.splice(-2)[0]) {
					console.log("Removing useless Workload Entered entry for week " + dates[workloadEntered.length - 1]);
					workloadEntered = workloadEntered.splice(0, workloadEntered.length-2);
				}
				
				// Ajout de la charge totale en cible
				while (workloadTarget.length < dates.length) {
					workloadTarget.push(Math.round(cumulatedWorkload / 3600));
				}
				
				// Calcul de la charge réelle
				cumulatedWorkload = 0;
				issues.sort(function(a, b) { return getDate(a, realEndDateField).getTime() - getDate(b, realEndDateField).getTime(); });
				for (var i=0; i < data.total; i++) {
					var issue = issues[i];
					var issueRealEnd = getDate(issue, realEndDateField);
					if (issueRealEnd.getTime() == maxEndDate.getTime()) {
						break;
					}
					
					var week = getWeekNumber(issueRealEnd);
					if (week < dates[0]) {
						continue;
					}
					
					cumulatedWorkload += issue.fields.timeestimate;
					if (workloadReal.length > 0 && dates[workloadReal.length-1] == week) {
						workloadReal[workloadReal.length-1] = Math.round(cumulatedWorkload / 3600);
					}
					else {
						if (workloadReal.length == 0 && dates[0] < week) {
							workloadReal.push(0);
						}
						
						while (workloadReal.length > 0 && dates[workloadReal.length-1] < (week-1))	{
							workloadReal.push(workloadReal.slice(-1)[0]);
						}
						workloadReal.push(Math.round(cumulatedWorkload / 3600));
					}
					
					console.log("Actual workload for week " + week + ": " + Math.round(cumulatedWorkload / 3600));
				}
				
				// Ajout de la charge pour les semaines jusqu'à aujourd'hui le cas échéant
				var currentWeek = getWeekNumber(new Date());
				if (dates.length > 0 && currentWeek >= dates[0]) {
					while (currentWeek >= dates[workloadReal.length]) {
						workloadReal.push(Math.round(cumulatedWorkload / 3600));
						console.log("Adding extra data point for Actual Workload for week " + dates[workloadReal.length-1]);
					}
				}
				
				var spi = workloadReal[workloadReal.length-1] / workloadExpected[workloadReal.length-1]
				console.log("SPI is " + spi.toFixed(2));
				
				for (var i=0; i < dates.length; i++) {
					var weekno = dates[i] % 100
					dates[i] = "S" + weekno;
				}
				
				var chartData = {
					labels: dates,
					datasets: [
						{
							label: "Budget total du projet",
							fillColor: "rgba(0,173,239,0)",
							strokeColor: "rgba(0,173,239,1)",
							pointColor: 'rgba(0,173,239,1)',
							pointStrokeColor: 'rgba(0,173,239,1)',
							data: workloadTarget
						},
						{
							label: "Budget des tâches planifiées",
							fillColor: "rgba(220,220,220,0.2)",
							strokeColor: "rgba(220,220,220,1)",
							pointColor: 'rgba(220,220,220,1)',
							pointStrokeColor: 'rgba(220,220,220,1)',
							data: workloadExpected
						},
						{
							label: "Budget des tâches terminées",
							fillColor: "rgba(232,159,69,0.2)",
							strokeColor: "rgba(232,159,69,1)",
							pointColor: 'rgba(232,159,69,1)',
							pointStrokeColor: 'rgba(232,159,69,1)',
							data: workloadReal
						}
					]
				};
				
				
				$("#spi #value").text(spi.toFixed(2));
				$("#spi #icon").css("background-color", (spi < 0.8) ? "red" : ((spi < 0.95) ? "orange" : "green"));
				if (workloadEntered.splice(-1)[0] > 0) {
					chartData.datasets.push(
						{
							label: "Temps saisi (régie)",
							fillColor: "rgba(110,44,159,0)",
							strokeColor: "rgba(110,44,159,1)",
							pointColor: 'rgba(110,44,159,1)',
							pointStrokeColor: 'rgba(110,44,159,1)',
							data: workloadEntered
						}
					);
					var cpi = workloadReal[workloadEntered.length-1] / workloadEntered[workloadEntered.length-1]
					console.log("CPI is " + cpi.toFixed(2));
					$("#cpi #value").text(cpi.toFixed(2));
					$("#cpi #icon").css("background-color", (cpi < 0.8) ? "red" : ((cpi < 0.95) ? "orange" : "green"));
					$("#cpi").show();
				}
				else {
					console.log("No workload data entered");
				}
				
				var chartOptions = {
					animation: false,
					pointDot: true,
					scaleType: "number",
					bezierCurve: false,
					legendTemplate : "<ul style=\"list-style-type: none\"><% for (var i=0; i<datasets.length; i++){%><li style=\"display: inline-block\"><div style=\"margin: 0px 10px; display: inline-block; width: 10px; height: 10px; background-color:<%=datasets[i].strokeColor%>\" /><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
				};
				
				$("#chart").width($(window).width());
				$("#chart").height(300);
				
				var ctx = $("#chart").get(0).getContext("2d");
				var myLineChart = new Chart(ctx).Line(chartData, chartOptions);
				$("#legend").append(myLineChart.generateLegend());
				
				$("#chart").on("click", function(event) {
					var activePoints = myLineChart.getPointsAtEvent(event);
					var week = activePoints[0].label;
					var weekDate = weekDates[week];
					var query = "project = currentProject() " +
								"AND issuetype=Tâche " +
								"AND ( ( \"Date de fin previsionnelle\" >= " + weekDate.start.toISOString().substr(0, 10) + " " +
								"        AND \"Date de fin previsionnelle\" <= " + weekDate.end.toISOString().substr(0, 10) + " ) " +
								"   OR ( \"Date de fin réelle\" >= " + weekDate.start.toISOString().substr(0, 10) + " " +
								"        AND \"Date de fin réelle\" <= " + weekDate.end.toISOString().substr(0, 10) + " ) )";
					//var url = "/issues/?jql=project%20%3D%20currentProject()%20AND%20issuetype%20%3D%20T%C3%A2che%20AND%20%22Date%20de%20fin%20previsionnelle%22%20%3E%3D%20" + weekDate.start.toISOString().substr(0, 10) + "%20AND%20%22Date%20de%20fin%20previsionnelle%22%20%3C%3D%20" + weekDate.end.toISOString().substr(0, 10);
					var url = "/issues/?jql=" + encodeURIComponent(query);
					//top.window.location.href = url;
					window.open(url, '_blank');
				});
			},
			error: function(msg) { console.log("API call error: " + msg); }});
	});
})(jQuery);