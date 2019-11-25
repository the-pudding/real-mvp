


import Swiper from 'swiper'
import lodash from 'lodash'
import * as ss from 'simple-statistics'
import noUiSlider from 'nouislider'
let radiusSize = 4;
let mvpColor = "#fff";

let showPlayers = false;
let yearText = null;

let hideRatio = false;
if(hideRatio){
  d3.select("body").classed("hide-ratio",true);
}
let playersToShow = ["James Harden","Giannis Antetokounmpo","Stephen Curry"]

let playersUpdate = {
  "Giannis Antetokounmpo":"Giannis"
}

function getName(data){
  if(!data.last){
    return data.name.slice(0,1)+". "+ data.name.split(" ")[1]
  }
  return data.name.slice(0,1)+". "+data.last
}

let mvps = {
  2019:"Giannis Antetokounmpo",
  2018:"James Harden",
  2017:"Russell Westbrook",
  2016:"Stephen Curry",
  2015:"Stephen Curry",
  2014:"Kevin Durant",
  2013:"LeBron James",
  2012:"LeBron James",
  2011:"Derrick Rose",
  2010:"LeBron James",
  2009:"LeBron James",
  2008:"Kobe Bryant",
  2007:"Dirk Nowitzki",
  2006:"Steve Nash",
  2005:"Steve Nash",
  2004:"Kevin Garnett",
  2003:"Tim Duncan",
  2002:"Tim Duncan",
  2001:"Allen Iverson",
  2000:"Shaquille O'Neal",
  1999:"Karl Malone",
  1998:"Michael Jordan",
  1997:"Karl Malone",
  1996:"Michael Jordan",
  1995:"David Robinson",
  1994:"Hakeem Olajuwon",
  1993:"Charles Barkley",
  1992:"Michael Jordan",
  1991:"Michael Jordan",
  1990:"Magic Johnson",
  1989:"Magic Johnson",
  1988:"Michael Jordan"
};

var mvpStrings = ["2019-Giannis Antetokounmpo", "2018-James Harden", "2017-Russell Westbrook", "2016-Stephen Curry", "2015-Stephen Curry", "2014-Kevin Durant", "2013-LeBron James", "2012-LeBron James", "2011-Derrick Rose", "2010-LeBron James", "2009-LeBron James", "2008-Kobe Bryant", "2007-Dirk Nowitzki", "2006-Steve Nash", "2005-Steve Nash", "2004-Kevin Garnett", "2003-Tim Duncan", "2002-Tim Duncan", "2001-Allen Iverson", "2000-Shaquille O'Neal", "1999-Karl Malone", "1998-Michael Jordan", "1997-Karl Malone", "1996-Michael Jordan", "1995-David Robinson", "1994-Hakeem Olajuwon", "1993-Charles Barkley", "1992-Michael Jordan", "1991-Michael Jordan", "1990-Magic Johnson", "1989-Magic Johnson", "1988-Michael Jordan"];

var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let playerNestedData = null;
let activeYear = null;
let allPlayerChecked = false;
let playerLine = null;
let playerContainer = null;
let playerTrackContainer = null;
let maxY = null;
let playerClicked = null;
let seasonData = null;
let playerData = null;
let inflationData = null;
let rawData = null;
let nestedData = null;
let uniq = lodash.uniqBy;
let withSalaryData = null;
let topPlayerData = null;
let stat = "WS";
let rescaleX = false;
let margin = 60;
let width = Math.floor(viewportHeight*.7) - margin*1.5;
let height = Math.floor(viewportHeight*.7) - margin;
let maxRadius = 16;
let maxYear = 2019;
let minYear = 1988;
let million = 1000000;
let area = 5000;
let year = null;
let duration = 500;
let top = 200;
let topPerf = 200;
let orangeScale = null;
let purpleScale = null;
let scaleF = null;
let scaleR = null;
let scaleY = null;
let scaleX = null;
let line = null;

let svg = null;
let axis = null;
let vis = null;
let vor = null;

let ratioExtent = null;
let statExtent = null;
let salaryExtent = null;
let ease = d3.easeCubicOut
let orient = ({
  top: text => text.attr("text-anchor", "middle").attr("y", -6),
  right: text => text.attr("text-anchor", "start").attr("x", 6).attr('y', 6),
  bottom: text => text.attr("text-anchor", "middle").attr("y", 12),
  left: text => text.attr("text-anchor", "end").attr("x", -6).attr('y', 6)
})
let cellData = null;

function resize() {}

function inflateSalary({year, salary}) {
  // const values = inflationData.filter(d => +d.year >= year).map(d => +d.value);
  // console.log(values);
  // const rate = 1 + d3.sum(values) / 100;

  const { Avg } = inflationData.find(d => +d.Year === 2019);
  const match = inflationData.find(d => +d.Year === year);
  return ((salary * +Avg) / match.Avg) * 100 / 100;

  //return salary * rate;
}

function getTopPlayerData(){
  const yearData = nestedData.find(d => +d.key === year);
  let yearSalaryData = yearData.values.filter(function(d){
    return d.salaryInflated;
  })

  yearSalaryData.sort((a,b) => d3.descending(a.salaryInflated, b.salaryInflated));

  var topSalaried = top;

  yearSalaryData = yearSalaryData.slice(0, topSalaried);


  let yearPlayerData = yearData.values.filter(function(d){
    return d.salaryInflated;
  })

  yearPlayerData.sort((a,b) => d3.descending(a[stat], b[stat]));
  yearPlayerData = yearPlayerData.slice(0, topPerf);

  let unionData = lodash.unionBy(yearPlayerData, yearSalaryData, 'bbrID');
  if(allPlayerChecked){
    return rawData.filter(function(d){
      return d.salaryInflated;
    }).sort(function(a,b){
      var mvpYearA = mvpStrings.indexOf(a.year+"-"+a.name);
      var mvpYearB = mvpStrings.indexOf(b.year+"-"+b.name);
      return mvpYearA - mvpYearB
    })
  }
  return unionData
}

function playerStreakData(){
  playerNestedData = d3
    .nest()
    .key(d => d.bbrID)
    .entries(rawData)

}

function prepareData() {
  const data = uniq(seasonData, d => `${d.bbrID}${d.Season}`);

  const lookupName = id => {
    const match = playerData.find(d => d.bbrID === id);
    return match ? match.name : '';
  };

  const lookupNameFirst = id => {
    const match = playerData.find(d => d.bbrID === id);
    return match ? match.first : '';
  };

  const lookupNameLast = id => {
    const match = playerData.find(d => d.bbrID === id);
    return match ? match.last : '';
  };


  // var filtered = data.filter(function(d){
  //   return d.bbrID == "cartevi01";
  // })

  const clean = data.map(d => {
    const year = +d.Season.split('-')[0] + 1;
    const name = lookupName(d.bbrID);
    const salary = +d.Salary;
    const first = lookupNameFirst(d.bbrID);
    const last = lookupNameLast(d.bbrID);
    const salaryInflated = inflateSalary({year, salary})
    return {
      ...d,
      name,
      year,
      salary,
      first,
      last,
      salaryInflated,
      G: +d.G,
      MP: +d.MP,
      BPM:+d.BPM,
      PER: +d.PER,
      WS: +d.WS,
      VORP: +d.VORP,
      net_rating: +d.net_rating,
      pie: +d.pie,
      ratio: (+d[stat] / salaryInflated * million)
    };
  });

  return clean.filter(d => d.year >= minYear).filter(d => d.MP * d.G >= 1300);
}

function prepData(){
  withSalaryData = rawData.filter(d => d.salaryInflated);

  statExtent = d3.extent(withSalaryData,function(d,i){
    return d[stat];
  });

  salaryExtent = d3.extent(withSalaryData, d => d.salaryInflated);
  if(rescaleX){
    year = activeYear
    let yearSalaryData = rawData.filter(function(d){
      return d.year == year;
    })
    salaryExtent = d3.extent(yearSalaryData, d => d.salaryInflated);
  }

  ratioExtent = d3.extent(withSalaryData, d => d.ratio)

  var yearExtent = d3.extent(rawData,function(d){return +d.year; });

  nestedData = d3
    .nest()
    .key(d => +d.year)
    .entries(rawData)
    .map(d => {
      // add regression stuff
      const pairs = d.values.map(v => [v.salaryInflated, v[stat]]);
      const regression = ss.linearRegression(pairs);
      const ratePerMil = +(regression.m * million).toFixed(3);
      const t = 10;
      const regressionLine = d3.range(t).map(d => {
        const x = d / (t - 1) * salaryExtent[1];
        return {
          x,
          y: regression.m * x + regression.b
        };
      });

      return {
        ...d,
        regressionLine,
        regression,
        ratePerMil
      };
    });

}

function updateFrame(){

  //scaleF = d3.scaleDiverging(d3.interpolatePRGn);
  scaleR = d3.scaleSqrt()
    .domain(statExtent)
    .range([1, maxRadius])
    .clamp(true);
  //
  scaleY = d3.scaleLinear()
    .domain(statExtent)
    .range([height, 0])
    .nice();

  scaleX = d3.scaleLinear()
    .domain([0, salaryExtent[1]])
    .range([0, width])
    .nice();

  playerLine = d3
      .line()
      .x(d => scaleX(d.salaryInflated))
      .y(d => scaleY(d[stat]));

  line = d3
      .line()
      .x(d => scaleX(d.x))
      .y(d => scaleY(d.y));

  maxY = scaleY.domain()[1];
  year = activeYear

  const axisX = d3
    .axisBottom(scaleX)
    .tickFormat(d3.format('$.02s'))
    .ticks(5)
    .tickSize(-height)
    .tickPadding(margin * 0.5)

  axis
    .selectAll("g")
    .transition()
    .duration(500)
    .style("opacity",0)
    .on("end",function(d){
      d3.select(this).remove()
    })

  axis
    .append("g")
    .attr("class","axis--x axis")
    //.select('.axis--x')
    .call(axisX)
    .attr('transform', `translate(${margin}, ${height})`)
    .style("opacity",0)
    .transition()
    .delay(100)
    .duration(500)
    .style("opacity",1)
    ;

  var format = '0.0f';
  if(stat == "WS/48"){
    format = '0.2f';
  }

  const axisY = d3
    .axisLeft(scaleY)
    .tickFormat(d3.format(format))
    .ticks(10)
    .tickSize(-width)
    .tickPadding(margin * 0.5)

  axis
    .append("g")
    .attr("class","axis--y axis")
    //.select('.axis--y')
    .call(axisY)
    .attr('transform', `translate(${margin}, ${margin})`);

}

function buildFrame(){

  svg = d3.select(".graphic-wrapper").append("svg")
    .attr("width",width+margin*1.5)
    .attr("height",height+margin)
    .style("width",width+margin*1.5+"px")
    .style("height",height+margin+"px")
    ;

  d3.select(".graphic-wrapper").append("div")
    .attr("class","left-axis")
    .style("width",width+margin*1.5+"px")
    .style("height",height+margin+"px")
    ;

  d3.select(".graphic-wrapper").append("div")
    .attr("class","bottom-axis")
    .style("width",width+margin*1.5+"px")
    .style("height",height+margin+"px")
    ;


  var defs = svg.append("defs")

  yearText = svg.append("text")
    .attr("class","year-text")
    .attr("x",484.7)
    .attr("y",30)
    ;

  var defs2 = defs.append("linearGradient")
    .attr("y1","0%")
    .attr("y2","100%")
    .attr("x1",5)
    .attr("x2",5)
    .attr("id","purple")
    .attr("gradientUnits","userSpaceOnUse")
  defs2
    .append("stop")
    .attr("stop-color","#9985AA")
    .attr("stop-opacity",1)
  defs2
    .append("stop")
    .attr("stop-color","#9985AA")
    .attr("stop-opacity",0)
    .attr("offset",1)

  var defs1 = defs.append("linearGradient")
    .attr("x1","0%")
    .attr("x2","100%")
    .attr("y1",5)
    .attr("y2",5)
    .attr("id","orange")
    .attr("gradientUnits","userSpaceOnUse")
  defs1
    .append("stop")
    .attr("stop-color","#EF983D")
    .attr("stop-opacity",0)
  defs1
    .append("stop")
    .attr("stop-color","#EF983D")
    .attr("stop-opacity",1)
    .attr("offset",1)

  axis = svg.append('g').attr('class', 'g-axis');
  vis = svg.append('g').attr('class', 'g-vis')
  playerContainer = vis.append("g");
  playerTrackContainer = vis.append("g").attr("class","player-line");

  vor = svg.append('g').attr('class', 'g-vor')
  vis.attr('transform', `translate(${margin}, ${margin})`)
  vor.attr('transform', `translate(${margin}, ${margin})`)
  vis.append("path").attr("class","regression");

  orangeScale = d3.scaleLinear().domain([salaryExtent[0],salaryExtent[1]*.7]).range(["#022A3A","#EF983D"]).clamp(true);
  purpleScale = d3.scaleLinear().domain([statExtent[0],statExtent[1]*.7]).range(["#022A3A","#9985AA"]).clamp(true);

  scaleF = d3.scaleDiverging(d3.interpolatePRGn);

  scaleR = d3.scaleSqrt()
    .domain(statExtent)
    .range([1, maxRadius])
    .clamp(true);
  //
  scaleY = d3.scaleLinear()
    .domain(statExtent)
    .range([height, 0])
    .nice();

  scaleX = d3.scaleLinear()
    .domain([0, salaryExtent[1]])
    .range([0, width])
    .nice();

  playerLine = d3
      .line()
      .x(d => scaleX(d.salaryInflated))
      .y(d => scaleY(d[stat]));


  line = d3
      .line()
      .x(d => scaleX(d.x))
      .y(d => scaleY(d.y));

  maxY = scaleY.domain()[1];
  year = activeYear

  const axisX = d3
    .axisBottom(scaleX)
    .tickFormat(d3.format('$.0s'))
    .ticks(5)
    .tickSize(-height)
    .tickPadding(margin * 0.5)

  axis
    .append("line")
    .attr("class","axis-line")
    .attr("x1",margin*.5+13)
    .attr("x2",margin*.5+13)
    .attr("y1",0)
    .attr("y2",height)
    .attr("stroke","url(#purple)")

  axis
    .append("line")
    .attr("class","axis-line")
    .attr("x1",0)
    .attr("x2",width)
    .attr("y1",height+margin*.5-20)
    .attr("y2",height+margin*.5-20)
    .attr("stroke","url(#orange)")

  axis
    .append("g")
    .attr("class","axis--x axis")
    //.select('.axis--x')
    .call(axisX)
    .attr('transform', `translate(${margin}, ${height})`)
    ;
  var format = '0.0f';
  if(stat == "WS/48"){
    format = '0.2f';
  }
  const axisY = d3
    .axisLeft(scaleY)
    .tickFormat(d3.format(format))
    .ticks(10)
    .tickSize(-width)
    .tickPadding(margin * 0.5)

  axis
    .append("g")
    .attr("class","axis--y axis")
    //.select('.axis--y')
    .call(axisY)
    .attr('transform', `translate(${margin}, ${margin})`);
}

function setStats(){
  rawData = prepareData()

  prepData();

}

function init(data) {

  var blob = d3.select(".blob");

  d3.select("body")
    .on("click", function(){
      var coor = d3.mouse(this);

      if (d3.event.shiftKey) {
        blob
          .transition()
          .duration(1500)
          .style("transform","translate("+coor[0]+"px,"+coor[1]+"px)")
      }
    })


  var yearSlider = d3.select("#year-slider").node();
  activeYear = 2019;

  noUiSlider.create(yearSlider, {
    start: [activeYear],
    step: 1,
    range: {
        'min': [1988],
        'max': [2019]
    }
  });


  d3.select("#limit-players").on("change", function(){
    if(d3.select(this).property("checked")){
      showPlayers = true;
    } else {
      showPlayers = false;
    }
    // prepData();
    // updateFrame();
    buildChart();
  })

  d3.select("#rescale-x").on("change", function(){
    if(d3.select(this).property("checked")){
      rescaleX = true;
    } else {
      rescaleX = false;
    }
    prepData();
    updateFrame();
    buildChart();

  })

  d3.select(".stat-chooser").on("change", function(){
    var form = d3.select(this).node();
    for(var i=0; i<form.length; i++){
      if(form[i].checked){
        stat = form[i].value;
      }
    }
    setStats()
    updateFrame();
    buildChart();
  })

  d3.select("#all-players").on("change",function(d){
    if(d3.select(this).property("checked")){
      allPlayerChecked = true;
    } else {
      allPlayerChecked = false;
    }
    prepData();
    updateFrame();
    buildChart();
  });

  // var mySwiper = new Swiper('.swiper-container', {
  //     speed: 400,
  //     spaceBetween: 100,
  //     navigation: {
  //       nextEl: '.swiper-button-next',
  //       prevEl: '.swiper-button-prev',
  //     }
  // })
  // ;
  //
  // mySwiper.on('slideChange', function () {
  //   activeYear = +mySwiper.slides[mySwiper.activeIndex].getAttribute("data-year");
  //   year = activeYear;
  //   buildChart();
  // });
  //
  // activeYear = +mySwiper.slides[mySwiper.activeIndex].getAttribute("data-year");
  //
  // d3.select(".swiper-wrapper").selectAll(".swiper-slide").select("div").style("height",Math.floor(viewportHeight*.3)+"px");

  seasonData = data[0];
  playerData = data[1];
  inflationData = data[2];
  stat = "VORP";
  setStats();
  playerStreakData();
  buildFrame();

  d3.select(".player-chooser-select")
    .on("change",function(d){
      var sel = d3.select(this).node();
      var id = sel.options[sel.selectedIndex].value;
      buildTrack(id);
    })
    .selectAll("option")
    .data(playerData.sort(function(a,b){
      return a.name - b.name;
    }))
    .enter()
    .append("option")
    .sort(function(a,b){
      return a.name - b.name;
    })
    .attr("class","player-chooser-select-option")
    .attr("value",function(d){
      return d.bbrID
    })
    .text(function(d){
      return d.name;
    })


  yearSlider.noUiSlider.on('update', function (values, handle) {
    d3.select(".year-slider-value").text(+values[handle]);
    activeYear = +values[handle];
    year = activeYear;
    if(rescaleX){
      prepData();
      updateFrame();

    }
    buildChart();
  });


  // buildChart();
}

function buildTrack(selected){


  var thing = playerNestedData.find(d => d.key === selected)
  playerTrackContainer.selectAll("g").remove()

  thing.values = thing.values.sort(function(a,b){
    return a.year - b.year;
  })

  if(selected != playerClicked){
    playerClicked = selected;

    vor
      .selectAll('.player-arrow')
      .transition()
      .duration(duration)
      .ease(ease)
      .style('opacity',function(d){
        if(d.data.bbrID == playerClicked){
          return 1;
        }
        return 0;
      })

    vor
      .selectAll('text.bg')
      .transition()
      .duration(duration)
      .ease(ease)
      .style('opacity',function(d){
        if(d.data.bbrID == playerClicked){
          return 1;
        }
        return 0;
      })

    vor
      .selectAll('text.fg')
      .transition()
      .duration(duration)
      .ease(ease)
      .style('opacity',function(d){
        if(d.data.bbrID == playerClicked){
          return 1;
        }
        return 0;
      })


    playerTrackContainer.append("g")
      .append("path")
      .attr("class","hover-line")
      .datum(thing.values)
      .attr('d', playerLine)
      ;

    playerTrackContainer.append("g")
      .selectAll("circle")
      .data(thing.values)
      .enter()
      .append("circle")
      .attr('cx', 0).attr('cy', 0).attr('r', radiusSize)
      .attr('transform', d => {
        const x = scaleX(d.salaryInflated);
        const y = scaleY(d[stat]);
        return `translate(${x}, ${y})`;
      })
      ;

    var textG = playerTrackContainer.append("g")
      .selectAll("g")
      .data(thing.values)
      .enter()
      .append("g")
      .attr('transform', d => {
        const x = scaleX(d.salaryInflated);
        const y = scaleY(d[stat]);
        return `translate(${x}, ${y})`;
      })

    textG
      .append("text")
      .attr("class","player-track-bg")
      .attr('x', 0).attr('y', -8).text(function(d){
        return d.year;
      })
      ;

    textG
      .append("text")
      .attr("class","player-track-fg")
      .attr('x', 0).attr('y', -8).text(function(d){
        return d.year;
      })
      ;



    }
    else {
      playerClicked = null;
    }



}

function buildChart(){
  topPlayerData = getTopPlayerData();
  yearText.text(year);

  cellData = d3.voronoi()
    .x(d => scaleX(d.salaryInflated))
    .y(d => scaleY(d[stat]))
    .extent([[-1, -1], [width - margin, height - margin]])
    .polygons(topPlayerData)

  const ratioMedian = d3.median(topPlayerData, d => d.ratio)
  const [ratioMin, ratioMax] = d3.extent(topPlayerData, d => d.ratio)
  scaleF.domain([ratioMin, ratioMedian, ratioMax])
  const {regressionLine} = nestedData.find(d => +d.key === year)

  vis
    .select('.regression')
    .datum(regressionLine)
    .transition()
    .ease(ease)
    .duration(duration)
    .attr('d', line);

  const player = playerContainer.selectAll('.player').data(topPlayerData, d => d.bbrID)
    .join(enter => {
      const p = enter.append('g')
      p.attr('transform', d => {
        const x = scaleX(d.salaryInflated);
        const y = scaleY(d[stat]);
        return `translate(${x}, ${y})`;
      })
      p.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 1);
      return p;
    })
    .attr('class', 'player');

  player.transition().duration(duration).ease(ease).attr('transform', d => {
      const x = scaleX(d.salaryInflated);
      const y = scaleY(d[stat]);
      return `translate(${x}, ${y})`;
    })
    ;

  player.select('circle')
    .transition()
    .duration(duration)
    .ease(ease)
    .attr('r', radiusSize)
    .style('fill',function(d){
      var mvp = mvps[year];
      if(allPlayerChecked){
        var mvpYear = mvpStrings.indexOf(d.year+"-"+d.name);
        if(mvpYear > -1) {
          return mvpColor;
        }
      }
      else {
        if(d.name == mvp){
          return mvpColor;
        }
      }
      //return orangeScale(d.salaryInflated)
      //return purpleScale(d[stat])
      return d3.color(d3.interpolateRgb(orangeScale(+d.salaryInflated),purpleScale(d[stat]))(.5)).brighter(1);
      return scaleF(d.ratio);
    })
    .style("opacity",function(d){
      if(showPlayers){
        if(playersToShow.indexOf(d.name) == -1){
          return 0
        }
        return null;
      }
      return null;
    })
    .style('stroke',function(d){
      var mvp = mvps[year];
      if(allPlayerChecked){
        var mvpYear = mvpStrings.indexOf(d.year+"-"+d.name);
        if(mvpYear > -1) {
          return mvpColor;
        }
      }
      else {
        if(d.name == mvp){
          return mvpColor;
        }
      }
      //return orangeScale(d.salaryInflated)
      //return purpleScale(d[stat])
      return d3.color(d3.interpolateRgb(orangeScale(+d.salaryInflated),purpleScale(d[stat]))(.5)).brighter(1.5);
      return scaleF(d.ratio);
    })

  // labels
  const text = vor
    .selectAll('text.bg')
    .data(cellData.filter(d => d), (d,i) => {
      if (d) return d.data.bbrID
      return null
    })
    .join(enter => {
      const t = enter.append('text').attr('class', 'bg')
      t.text(function(d){
        if(Object.keys(playersUpdate).indexOf(d.data.name) > -1){
          return playersUpdate[d.data.name];
        }
        return getName(d.data)//d.data.name//d.data.last;
      })
      .attr('transform', d => {
        const[x,y] = d3.polygonCentroid(d)
        return `translate(${x}, ${y})`;
      })
      .style('opacity', 0)
      return t;
    })
    .style("pointer-events","none")

  text
    .transition()
    .duration(duration)
    .ease(ease)
    .attr('transform', d => {
      const[x,y] = d3.polygonCentroid(d)
      return `translate(${x}, ${y})`;
    })
    .each((d,i,n) => {
      const t = d3.select(n[i])
      const x = scaleX(d.data.salaryInflated);
      const y = scaleY(d.data[stat]);
      const [cx, cy] = d3.polygonCentroid(d);
      const angle = Math.round(Math.atan2(cy - y, cx - x) / Math.PI * 2);
      t.call(angle === 0 ? orient.right
             : angle === -1 ? orient.top
             : angle === 1 ? orient.bottom
             : orient.left);
    })
    .style('opacity',function(d){
      if(showPlayers){
        if(playersToShow.indexOf(d.data.name) == -1){
          return 0
        }
        return 1;
      }
      if(playerClicked){
        return 0;
      }
      return d3.polygonArea(d) > area ? 1 : 0;
    })
    ;

  const textLabel = vor
    .selectAll('text.fg')
    .data(cellData.filter(d => d), (d,i) => {
      if (d) return d.data.bbrID
      return null
    })
    .join(enter => {
      const t = enter.append('text').attr('class', 'fg')
      t.text(function(d){
          if(Object.keys(playersUpdate).indexOf(d.data.name) > -1){
            return playersUpdate[d.data.name];
          }
          return getName(d.data)//d.data.name//d.data.last;
        })
        .attr('transform', d => {
          const[x,y] = d3.polygonCentroid(d)
          return `translate(${x}, ${y})`;
        })
        .style("opacity",0)
      return t;
    })
    .style("pointer-events","none")

  textLabel
    .transition()
    .duration(duration)
    .ease(ease)
    .attr('transform', d => {
      const[x,y] = d3.polygonCentroid(d)
      return `translate(${x}, ${y})`;
    })
    .each((d,i,n) => {
      const t = d3.select(n[i])
      const x = scaleX(d.data.salaryInflated);
      const y = scaleY(d.data[stat]);
      const [cx, cy] = d3.polygonCentroid(d);
      const angle = Math.round(Math.atan2(cy - y, cx - x) / Math.PI * 2);
      t.call(angle === 0 ? orient.right
             : angle === -1 ? orient.top
             : angle === 1 ? orient.bottom
             : orient.left);
    })
    .style('opacity',function(d){
      if(showPlayers){
        if(playersToShow.indexOf(d.data.name) == -1){
          return 0
        }
        return 1;
      }
      if(playerClicked){
        return 0;
      }
      return d3.polygonArea(d) > area ? 1 : 0;
    })


  const path = vor
    .selectAll('path')
    .data(cellData.filter(d => d), (d,i) => {
      if (d) return d.data.bbrID
      return null
    })
    .join('path')
    .style('opacity', 0)

  path
    .transition()
    .duration(duration)
    .ease(ease)
    .attr('d', d => `M${d3.polygonCentroid(d)}L${[scaleX(d.data.salaryInflated), scaleY(d.data[stat])]}`)
    .style('opacity',function(d){
      if(showPlayers){
        if(playersToShow.indexOf(d.data.name) == -1){
          return 0
        }
        return 1;
      }
      if(playerClicked){
        return 0;
      }
      return d3.polygonArea(d) > area ? 1 : 0;
    })
    .attr("class","player-arrow")
    .style("pointer-events","none")

  if(playerClicked){

    playerTrackContainer
      .selectAll("path")
      .transition()
      .duration(duration)
      .ease(ease)
      .attr('d', playerLine)

    playerTrackContainer.selectAll("circle")
      .transition()
      .duration(duration)
      .ease(ease)
      .attr('transform', d => {
        const x = scaleX(d.salaryInflated);
        const y = scaleY(d[stat]);
        return `translate(${x}, ${y})`;
      })

    playerTrackContainer.selectAll("text")
      .transition()
      .duration(duration)
      .ease(ease)
      .attr('transform', d => {
        const x = scaleX(d.salaryInflated);
        const y = scaleY(d[stat]);
        return `translate(${x}, ${y})`;
      })

  }

  const pathVor = vor
    .append("g")
    .selectAll('path')
    .data(cellData.filter(d => d), (d,i) => {
      if (d) return d.data.bbrID
      return null
    })
    .join('path')
    .style('opacity', 0)
    //.transition()
    //.duration(duration)
    //.ease(ease)
    .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; })
    .on("click",function(d){
      var selected = d.data.bbrID;
      if (!d3.event.shiftKey) {
        buildTrack(selected);
      }

    })
    .on("mouseover",function(d){

      console.log(d);

      var selected = d.data.bbrID;
      var selectedYear = d.data.year;
      if(!allPlayerChecked && !playerClicked && !showPlayers){
        player.select("circle")
          .style("fill",function(d){
            if(d.bbrID == selected){
              return "white";
            }
            return d3.color(d3.interpolateRgb(orangeScale(+d.salaryInflated),purpleScale(d[stat]))(.5)).brighter(1);
          })
          .style("stroke",function(d){
            if(d.bbrID == selected){
              return "white";
            }
            return d3.color(d3.interpolateRgb(orangeScale(+d.salaryInflated),purpleScale(d[stat]))(.5)).brighter(1.5);
          })

        path.style('opacity', d => {
          if(d.data.bbrID == selected){
            return 1;
          }
          return 0;//d3.polygonArea(d) > area ? 1 : 0
        })

        text.style('opacity', d => {
          if(d.data.bbrID == selected){
            return 1;
          }
          return 0;//d3.polygonArea(d) > area ? 1 : 0
        })

        textLabel.style('opacity', d => {
          if(d.data.bbrID == selected){
            return 1;
          }
          return 0;//d3.polygonArea(d) > area ? 1 : 0
        })

      }
      else if(!showPlayers) {
        var mvpYear = mvpStrings.indexOf(d.data.year+"-"+d.data.name);
        if(mvpYear > -1) {
          path.style('opacity', d => {
            if(d.data.bbrID == selected && d.data.year == selectedYear){
              return 1;
            }
            return d3.polygonArea(d) > area ? 1 : 0
          })

          text.style('opacity', d => {
            if(d.data.bbrID == selected && d.data.year == selectedYear){
              return 1;
            }
            return d3.polygonArea(d) > area ? 1 : 0
          })

          textLabel.style('opacity', d => {
            if(d.data.bbrID == selected && d.data.year == selectedYear){
              return 1;
            }
            return d3.polygonArea(d) > area ? 1 : 0
          })

        }
      }
    })
    .on("mouseout",function(d){
      if(!showPlayers && !playerClicked){
        path.style('opacity', d => {
          return d3.polygonArea(d) > area ? 1 : 0
        })

        text.style('opacity', d => {
          return d3.polygonArea(d) > area ? 1 : 0
        })

        textLabel.style('opacity', d => {
          return d3.polygonArea(d) > area ? 1 : 0
        })
      }


    })
    .attr("fill","rgba(0,0,0,0)")
    .style("pointer-events","all")
        //.attr('d', d => `M${d3.polygonCentroid(d)}L${[scaleX(d.data.salaryInflated), scaleY(d.data[stat])]}`)
        //.style('opacity', d => d3.polygonArea(d) > area ? 1 : 0)
      // window.setTimeout(function(d){
      //   year = year + 1
      //   console.log(year);
      //   buildChart();
      // },3000)
}

export default { init, resize };
