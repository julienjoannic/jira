(function($) {
	var maxEndDate = new Date("9999-12-31");
	var plannedStartDateField = "customfield_10051";
	var realEndDateField = "customfield_11186";
	var weekDates = [];
	
	function getDate(issue, date) {
		return (issue.fields[date] == null) ? maxEndDate : new Date(issue.fields[date]);
	}
	
	function dateToString(date) {
		return date.toLocaleDateString();
	}
	
	function getWeekNumber(d) {
		// Copy date so don't modify original
		d = new Date(+d);
		d.setHours(0,0,0);
		// Set to nearest Thursday: current date + 4 - current day number
		// Make Sunday's day number 7
		d.setDate(d.getDate() + 4 - (d.getDay()||7));
		// Get first day of year
		var year = d.getFullYear()
		var yearStart = new Date(d.getFullYear(),0,1);
		// Calculate full weeks to nearest Thursday
		var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
		
		var weekStart = new Date(+d);
		weekStart.setDate(d.getDate() - 4);
		var weekEnd = new Date(+d);
		weekEnd.setDate(d.getDate() + 2);
		weekDates["S"+weekNo] = { start: weekStart, end: weekEnd };
		
		// Return array of year and week number
		return year * 100 + weekNo;
	}

	$(document).ready(function() {
		console.log("ready()");
		$.ajax({
			url: "/rest/api/latest/search?jql=project%20%3D%20currentProject()%20AND%20issuetype%20%3D%20Tâche%20AND%20fixVersion%20%3D%20earliestUnreleasedVersion()",
			contentType: "application/json",
			success: function(data) {
				var dates = [];
				var workloadExpected = [];
				var workloadReal = [];
				var workloadTarget = [];
				var size;
				
				console.log("API call executed, " + data.total + " issue(s) found");
				
				// Calcul de la charge théorique
				var issues = data.issues;
				var cumulatedWorkload = 0;
				issues.sort(function(a, b) { return getDate(a, plannedStartDateField).getTime() - getDate(b, plannedStartDateField).getTime(); });
				for (var i=0; i < data.total; i++) {
					var issue = data.issues[i];
					var issueEnd = getDate(issue, plannedStartDateField)
					if (issueEnd.getTime() == maxEndDate.getTime()) {
						break;
					}
					
					cumulatedWorkload += issue.fields.timeestimate;
					var week = getWeekNumber(issueEnd);
					if (dates.length > 0 && dates.slice(-1)[0] == week) {
						workloadExpected[workloadExpected.length-1] = cumulatedWorkload / 3600;
					}
					else {
						while (dates.length > 0 && dates.slice(-1)[0] < (week-1)) {
							issueEnd.setDate(issueEnd.getDate() + 7);
							getWeekNumber(issueEnd); // To buffer week dates
							dates.push(dates.slice(-1)[0] + 1);
							workloadExpected.push(workloadExpected.slice(-1)[0]);
						}
						dates.push(week);
						workloadExpected.push(cumulatedWorkload / 3600);
					}
					console.log("Expected workload for week " + week + ": " + (cumulatedWorkload / 3600));
				}
				
				// Ajout de la charge totale en cible
				while (workloadTarget.length < dates.length) {
					workloadTarget.push(cumulatedWorkload / 3600);
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
						workloadReal[workloadReal.length-1] = cumulatedWorkload / 3600;
					}
					else {
						if (workloadReal.length == 0 && dates[0] < week) {
							workloadReal.push(0);
						}
						
						while (workloadReal.length > 0 && dates[workloadReal.length-1] < (week-1))	{
							workloadReal.push(workloadReal.slice(-1)[0]);
						}
						workloadReal.push(cumulatedWorkload / 3600);
					}
					
					console.log("Actual workload for week " + week + ": " + (cumulatedWorkload / 3600));
				}
				
				for (var i=0; i < dates.length; i++) {
					dates[i] = "S" + dates[i].toString().slice(4);
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