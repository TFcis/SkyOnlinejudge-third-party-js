// config
// var resultsUrl = 'json.php';
var resultsBeforeUrl = g_before_url;
var resultsFinalUrl = g_final_url; // prevent caching
var refreshInterval = 0;
var resultsUpdateTime = 200;
var activeOffset = 200;
var scrollSpeed = 1000;
var rowHeight = 70;

// global vars
var problemsCount = -1;
var problemsList = [];
var plist;
var teamTemplate;
var teamTemplateInside;
var isResolving = false;
var zCount = 10;
// global function
var fetchAndShow = null;

var nTeams = 0;
var currentResolvingRank = -1;

//solved is means score in oi contest also at now

$(function () {

	$(window).scroll(function(){
		$('.scoreboard-head').css('left', 0 - $(this).scrollLeft());
	});


	$.get(resultsBeforeUrl, function (resultsBefore) {
		$.get(resultsFinalUrl, function (resultsFinal) {

			console.log(resultsBefore);
			console.log(resultsFinal);

			problemsCount = Object.keys(resultsBefore.solved).length;
			problemsList = Object.keys(resultsBefore.solved);
			nTeams = resultsBefore.scoreboard.length;
			initScoreBoard(resultsBefore);

			var scoreboardHtml = '';

			resultsBefore = recalculateResults(resultsBefore);
			resultsFinal = recalculateResults(resultsFinal);
			resultsBefore = separateInstituteName(resultsBefore);
			resultsFinal = separateInstituteName(resultsFinal);
			var resultsMerged = linkScoreboard(resultsBefore, resultsFinal);

			console.log(resultsFinal);
			resultsBefore = populatePending(resultsBefore, resultsFinal);

			for (var i = 0; i < resultsBefore.scoreboard.length; i++) {
				scoreboardHtml += teamTemplate(resultsBefore.scoreboard[i]);
			}

			$('#scoreboard-body').html(scoreboardHtml);

			updateScoreboard(resultsBefore);

			var currentResolvingRank = nTeams;
			var currentResult = $.extend(true, {}, resultsBefore);
			console.log(resultsBefore);

			$('body').keydown(function(e){
				if(e.keyCode == 32){
					e.preventDefault();
					if (!isResolving) {
						isResolving = true;
						setActive(currentResolvingRank);
					} else {
						var resolveResult = resolveNext(resultsMerged, currentResult, currentResolvingRank);
						currentResolvingRank = resolveResult.newResolvingRank;
						currentResult = resolveResult.newResult;
						updateScoreboard(currentResult);
						setActive(currentResolvingRank);
					}
				}
			});


		},"json").fail(function(XMLHttpRequest, textStatus, errorThrown){
			console.log(XMLHttpRequest);
			console.log(textStatus);
			console.log(errorThrown);
		});
	},"json").fail(function(XMLHttpRequest, textStatus, errorThrown){
		console.log(XMLHttpRequest);
		console.log(textStatus);
		console.log(errorThrown);
	});



	// ------------------------------ functions ------------------------------

	// ------------------------------ initialize ------------------------------

	function initScoreBoard(result) {
		problems = [];
		for (problem in result.solved) {
			problems.push(problem);
		}
		// add column headers
		for (var i = 0; i < problemsCount; i++) {
			//var letter = toLetters(i + 1);
			var letter = problems[i];
			$('.scoreboard-problem-list').append('<div class="cell scoreboard-problem scoreboard-problem-' + letter + '">' + letter + '</div>');
		}

		// create handlebars template
		Handlebars.registerHelper("pending",function(s){
			if(s=="pending")return false;
			else{
				return true;
			}
		});
		var templateHtml =
		'<div class="cell scoreboard-rank">{{rankDisplay}}</div>' +
		'<div class="cell scoreboard-name"><b class="nowrap">{{name}}</b><br><span class="nowrap">{{institute}}</span></div>' +
		'<div class="cell scoreboard-score-count">{{solved}}</div>' +
		'<div class="cell scoreboard-score-total">{{points}}</div>' +
		'<div class="scoreboard-problem-list">';
		for (var i = 0; i < problemsCount; i++) {
			//var letter = toLetters(i + 1);
			var letter = problems[i];
			templateHtml += '<div class="cell scoreboard-problem scoreboard-point scoreboard-{{' + letter + '.s}} ';
			templateHtml += '{{#if ' + letter + '.a}} ';
			templateHtml += 'score{{' + letter + '.color}} ';
			templateHtml += '{{/if}} ';
			templateHtml += '">';
			/*templateHtml += '{{#if ' + letter + '.a}}';
			// templateHtml += '<span class="label label-result label-{{' + letter + '.s}}">';
			templateHtml += '<b>{{' + letter + '.a}}</b>';
			templateHtml += '{{#if ' + letter + '.t}} ';
			templateHtml += '({{' + letter + '.t}})';
			templateHtml += '{{/if}}';
			// templateHtml += '</span>';
			templateHtml += '{{/if}}';*/
			templateHtml += '{{#if ' + letter + '.a}}';
			templateHtml += '{{' + letter + '.score}}';
			templateHtml += '({{' + letter + '.a}})';
			templateHtml += '{{/if}}';
			templateHtml += '</div>'
		}
		templateHtml += '</div>';
		teamTemplate = Handlebars.compile(
			'<div class="scoreboard-row" data-rank="{{rank}}" data-team-id="{{id}}">' + templateHtml + '</div>'
		);
		teamTemplateInside = Handlebars.compile(templateHtml);
	}



	function separateInstituteName(result) {
		for (var i = 0; i < result.scoreboard.length; i++) {
			var fullName = result.scoreboard[i].name;
			var separatorIndex = result.scoreboard[i].name.indexOf(' - ');
			if (separatorIndex >= 0) {
				result.scoreboard[i].institute = fullName.substring(0, separatorIndex);
				result.scoreboard[i].name = fullName.substring(separatorIndex + 3);
			}
		}
		return result;
	}



	function linkScoreboard(resultsBefore, resultsFinal) {
		// merge old and new results together
		var resultsMerged = {};
		resultsMerged.attempted = {};
		resultsMerged.attempted.before = resultsBefore.attempted;
		resultsMerged.attempted.final = resultsFinal.attempted;
		resultsMerged.solved = {};
		resultsMerged.solved.before = resultsBefore.solved;
		resultsMerged.solved.final = resultsFinal.solved;
		resultsMerged.scoreboard = [];
		for (var i = 0; i < resultsBefore.scoreboard.length; i++) {

			var before = resultsBefore.scoreboard[i];
			var currentId = resultsBefore.scoreboard[i].id;
			var finalRank = findTeam(resultsFinal, currentId).index;
			var final = resultsFinal.scoreboard[finalRank];

			var scoreboard = {
				id: currentId,
				name: resultsBefore.scoreboard[i].name,
				group: resultsBefore.scoreboard[i].group,
				before: before,
				final: final
			};

			resultsMerged.scoreboard.push(scoreboard);
		}
		return resultsMerged;
	}



	function populatePending(resultsBefore, resultsFinal) {
		var resultsNew = $.extend(true, {}, resultsBefore);
		for(var i = 0; i < resultsNew.scoreboard.length; i++) {
			var teamBefore = resultsNew.scoreboard[i];
			var teamId = teamBefore.id;
			var teamFinal = findTeam(resultsFinal, teamId).data;
			for (problem in resultsNew.scoreboard[i]) {
				if (teamFinal[problem].a > teamBefore[problem].a) {
					resultsNew.scoreboard[i][problem].s = "pending";
					resultsNew.scoreboard[i][problem].a = teamFinal[problem].a;
				}
			}
		}
		return resultsNew;
	}



	function recalculateResults(results) {
		// for each team...
		problems = [];
		plist = results.problems;
		//console.log(plist);
		for (problem in results.solved) {
			problems.push(problem);
		}
		/*for(sc in results.problems){
			console.log(sc)
			//pscore.push(sc);
		}*/
		//console.log(pscore);
		for (var i = 0; i < results.scoreboard.length; i++) {
			var score = calculateScore(problems, plist, results.scoreboard[i])
			results.scoreboard[i].points = score.points;
			results.scoreboard[i].solved = score.solved;
			results.scoreboard[i] = score.team;
		}

		results.scoreboard.sort(compareResults);
		results = reassignRank(results);

		return results;
	}



	function calculateScore(problems, plist, team) {
		var sumScore = 0;
		var solved = 0;
		//color = [];
		for (var i = 0; i < problems.length; i++) {
			var problem = problems[i];
			console.log(problem);
			if (team[problem].a > 0) {
				var probStatus = team[problem];
				if (team[problem].s == "first" || team[problem].s == "solved") {
					//sumScore += (parseInt(probStatus.t) + (parseInt(probStatus.a) - 1) * 20);
					sumScore += team[problem].score;
					solved++;
				}
			}
			//console.log(plist[problem].score);
			var c = '_0';
			if(team[problem].score == 0){
				c = '_0';
			}
			else if(team[problem].score/plist[problem].score == 1){
				c = '_100';
			}
			else{
				c = '_' + Math.floor((team[problem].score/plist[problem].score)*10)*10 + '_' + (Math.floor((team[problem].score/plist[problem].score)*10)+1)*10;
			}
			
			//color.push(c);
			team[problem].color = c;
		}
		return {
			solved: solved,
			points: sumScore,
			team: team
		};
	}



	function reassignRank(results) {
		for (var i = 0; i < results.scoreboard.length; i++) {
			results.scoreboard[i].rank = i + 1;
			if ( i > 0 && compareResults(results.scoreboard[i], results.scoreboard[i - 1]) == 0) {
				results.scoreboard[i].rankDisplay = results.scoreboard[i - 1].rankDisplay;
			} else {
				results.scoreboard[i].rankDisplay = i + 1;
			}
		}
		return results;
	}



	// ------------------------------ resolving ------------------------------

	function resolveNext(resultsMerged, currentResult, currentResolvingRank) {
		if (currentResolvingRank < 1)
			return {
				newResult: currentResult,
				newResolvingRank: currentResolvingRank
			};

		var newResult = $.extend(true, {}, currentResult);

		var currentIndex = currentResolvingRank - 1
		var teamId = currentResult.scoreboard[currentIndex].id;
		var team = findTeam(resultsMerged, teamId).data;

		// replace score with final result
		// find first pending problem
		currentProblem = false;
		var problemsList = [];
		var pendingCount = 0;
		for (problem in newResult.solved) {
			if (newResult.scoreboard[currentIndex][problem].s == "pending") {
				currentProblem = problem;
				break;
			}
		}
		for (problem in newResult.solved) {
			problemsList.push(problem);
			if (newResult.scoreboard[currentIndex][problem].s == "pending") {
				pendingCount++;
			}
		}
		// replace score for that problem and recalculate score
		console.log(team.name, currentProblem);
		if (currentProblem !== false) {
			newResult.scoreboard[currentIndex][currentProblem] = team.final[currentProblem];
			console.log(newResult.scoreboard[currentIndex]);
			var score = calculateScore(problemsList, plist, newResult.scoreboard[currentIndex])
			newResult.scoreboard[currentIndex].solved = score.solved;
			newResult.scoreboard[currentIndex].points = score.points;
			pendingCount--;
		}
		// newResult.scoreboard[currentResolvingRank - 1] = team.final;

		// recalculate rank
		for (var i = currentResolvingRank - 1; i > 0; i--) {
			if (!hasBetterResult(newResult.scoreboard[i], newResult.scoreboard[i - 1]))
				break;
			var temp = newResult.scoreboard[i - 1];
			newResult.scoreboard[i - 1] = newResult.scoreboard[i];
			newResult.scoreboard[i] = temp;
			console.log("moving...", newResult.scoreboard[i - 1].name);
		}

		// reassign rank
		newResult = reassignRank(newResult);

		var oldRank = findTeam(currentResult, teamId).data.rank;
		var newRank = findTeam(newResult, teamId).data.rank;
		var newResolvingRank = currentResolvingRank;
		if (newRank == oldRank && pendingCount == 0) {
			newResolvingRank--;
		}

		console.log("TEAM info ", findTeam(currentResult, teamId).data, findTeam(newResult, teamId).data);
		console.log("RANK", oldRank, "TO", newRank);

		return {
			newResult: newResult,
			newResolvingRank: newResolvingRank
		};
	}



	function updateScoreboard(currentResult) {
		$('#scoreboard-body .scoreboard-row').each(function(){
			var teamId = $(this).data('team-id');
			var team = findTeam(currentResult, teamId).data;

			var oldRank = $(this).data('rank');
			$(this).data('rank', team.rank);
			var newRank = $(this).data('rank');

			$(this).html(teamTemplateInside(team));

			var thisRow = $(this);
			if (newRank < oldRank) {
				$(this).css('z-index', zCount);
				// $(this).addClass('hovering');
				zCount += 10;
			}
			setTimeout(function(){
				var top = rowHeight * (parseInt(thisRow.data('rank')) - 1);
				top += $('.scoreboard-head').height();
				thisRow.css('top', top + 'px');
			}, resultsUpdateTime);
			// setTimeout(function(){
			// 	thisRow.css('z-index', 1);
			// }, 2000);
		});
	}



	function setActive(rank) {
		if (rank < 1)
			return;

		var currentRow; // = $('.scoreboard-row[data-rank=' + rank + ']');
		$('.scoreboard-row').each(function(){
			if($(this).data('rank') == rank)
				currentRow = $(this);
		});

		$('html, body').stop().animate(
			{ scrollTop: rank * rowHeight - $(window).height() + activeOffset },
			scrollSpeed, 'swing', function() {}
		);
		$('.scoreboard-row').removeClass('active');
		currentRow.addClass('active');
	}



	// ------------------------------ helpers ------------------------------

	function toLetters(num) {
		var mod = num % 26,
			pow = num / 26 | 0,
			out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');
		return pow ? toLetters(pow) + out : out;
	}



	function findTeam(result, teamId) {
		for (var i = 0; i < result.scoreboard.length; i++) {
			if (result.scoreboard[i].id == teamId)
				return {
					index: i,
					data: result.scoreboard[i]
				};
		}
		return false;
	}



	function hasBetterResult (team1, team2) {
		return compareResults(team1, team2) < 0;
	}



	function compareResults (a, b) {
		// returns > 0 if b does better than a
		if (a.points - b.points !== 0) {
			return b.points - a.points;
		} else {
			/*var aTimeList = [];
			var bTimeList = [];
			for (problemIndex in problemsList) {
				var problem = problemsList[problemIndex];
				if (a[problem].s == "solved" || a[problem].s == "first")
					aTimeList.push(a[problem].t);
				if (b[problem].s == "solved" || b[problem].s == "first")
					bTimeList.push(b[problem].t);
			}
			aTimeList.sort(compareNumber);
			bTimeList.sort(compareNumber);
			for (var i = aTimeList.length - 1; i >= 0; i--) {
				if (aTimeList[i] !== bTimeList[i])
					return aTimeList[i] - bTimeList[i];
			}*/
			return 0;
		}
	}



	function compareNumber(x, y) {
		return x - y;
	}
});