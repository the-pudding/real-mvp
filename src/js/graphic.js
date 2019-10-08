
import Swiper from 'swiper'
import lodash from 'lodash'
import * as ss from 'simple-statistics'
var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

let activeYear = null;
let playerContainer = null;
let maxY = null;
let seasonData = null;
let playerData = null;
let inflationData = null;
let rawData = null;
let nestedData = null;
let uniq = lodash.uniqBy;
let withSalaryData = null;
let topPlayerData = null;
let stat = "WS";
let margin = 48;
let width = Math.floor(viewportHeight*.7) - margin*1.5;
let height = Math.floor(viewportHeight*.7) - margin;
let maxRadius = 16;
let maxYear = 2019;
let minYear = 1988;
let million = 1000000;
let area = 5000;
let duration = 500;
let year = 3000;
let top = 100;
let topPerf = 100;

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
  const values = inflationData.filter(d => +d.year >= year).map(d => +d.value);
  const rate = 1 + d3.sum(values) / 100;
  return salary * rate;
}

function getTopPlayerData(){
  const yearData = nestedData.find(d => +d.key === year);
  let yearPlayerData = yearData.values.filter(d => d.salaryInflated);
  yearPlayerData.sort((a,b) => d3.descending(a.salaryInflated, b.salaryInflated));
  yearPlayerData = yearPlayerData.slice(0, top);
  yearPlayerData.sort((a,b) => d3.descending(a[stat], b[stat]));
  return yearPlayerData.slice(0, topPerf)
}

function prepareData() {
  const data = uniq(seasonData, d => `${d.bbrID}${d.Season}`);

  const lookupName = id => {
    const match = playerData.find(d => d.bbrID === id);
    return match ? match.name : '';
  };

  const clean = data.map(d => {
    const year = +d.Season.split('-')[0] + 1;
    const name = lookupName(d.bbrID);
    const salary = +d.Salary;
    const salaryInflated = inflateSalary({year, salary})
    return {
      ...d,
      name,
      year,
      salary,
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

  return clean.filter(d => d.year >= minYear).filter(d => d.MP * d.G >= 1500);
}


function prepData(){
  withSalaryData = rawData.filter(d => d.salaryInflated);
  statExtent = d3.extent(withSalaryData, d => d[stat])
  salaryExtent = d3.extent(withSalaryData, d => d.salaryInflated);
  ratioExtent = d3.extent(withSalaryData, d => d.ratio)

  nestedData = d3
    .nest()
    .key(d => d.year)
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

function init(data) {
  var mySwiper = new Swiper('.swiper-container', {
      speed: 400,
      spaceBetween: 100,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      }

  })
  ;

  mySwiper.on('slideChange', function () {
    activeYear = +mySwiper.slides[mySwiper.activeIndex].getAttribute("data-year");
    year = activeYear;
    buildChart();
  });

  activeYear = +mySwiper.slides[mySwiper.activeIndex].getAttribute("data-year");

  d3.select(".swiper-wrapper").selectAll(".swiper-slide").select("div").style("height",Math.floor(viewportHeight*.3)+"px");


  seasonData = data[0];
  playerData = data[1];
  inflationData = data[2];
  rawData = prepareData()

  prepData();

  svg = d3.select(".graphic-wrapper").append("svg")
    .attr("width",width+margin*1.5)
    .attr("height",height+margin)
    .style("width",width+margin*1.5+"px")
    .style("height",height+margin+"px")
    ;

  axis = svg.append('g').attr('class', 'g-axis');
  vis = svg.append('g').attr('class', 'g-vis')
  playerContainer = vis.append("g");

  vor = svg.append('g').attr('class', 'g-vor')
  vis.attr('transform', `translate(${margin}, ${margin})`)
  vor.attr('transform', `translate(${margin}, ${margin})`)
  vis.append("path").attr("class","regression");

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
    .append("g")
    .attr("class","axis--x axis")
    //.select('.axis--x')
    .call(axisX)
    .attr('transform', `translate(${margin}, ${height})`);

  const axisY = d3
    .axisLeft(scaleY)
    .tickFormat(d3.format('0.1f'))
    .ticks(10)
    .tickSize(-width)
    .tickPadding(margin * 0.5)

  axis
    .append("g")
    .attr("class","axis--y axis")
    //.select('.axis--y')
    .call(axisY)
    .attr('transform', `translate(${margin}, ${margin})`);

  buildChart();
}

function buildChart(){
  topPlayerData = getTopPlayerData();

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
    });

  player.select('circle')
    .transition()
    .duration(duration)
    .ease(ease)
    .attr('r', 4)
    .style('fill', d => scaleF(d.ratio))

  // labels
  const text = vor
    .selectAll('text.bg')
    .data(cellData.filter(d => d), (d,i) => {
      if (d) return d.data.bbrID
      return null
    })
    .join(enter => {
      const t = enter.append('text').attr('class', 'bg')
      t.text(d => d.data.name)
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
    .style('opacity', d => d3.polygonArea(d) > area ? 1 : 0)



    //  ugly dupe label

  const textLabel = vor
    .selectAll('text.fg')
    .data(cellData.filter(d => d), (d,i) => {
      if (d) return d.data.bbrID
      return null
    })
    .join(enter => {
      const t = enter.append('text').attr('class', 'fg')
      t.text(d => d.data.name)
        .attr('transform', d => {
          const[x,y] = d3.polygonCentroid(d)
          return `translate(${x}, ${y})`;
        })
        .style('opacity', 0)
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
    .style('opacity', d => d3.polygonArea(d) > area ? 1 : 0)

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
    .style('opacity', d => d3.polygonArea(d) > area ? 1 : 0)
    .style("pointer-events","none")

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
    .on("mouseover",function(d){

  var selected = d.data.bbrID;
      thing.text("per rank:"+d.data.PER_rank+", VORP Rank:"+d.data.VORP_rank+", BPM Rank:"+d.data.BPM_rank+", WS Rank:"+d.data.WS_rank);
      path.style('opacity', d => {
        if(d.data.bbrID == selected){
          return 1;
        }
        return d3.polygonArea(d) > area ? 1 : 0
      })

      text.style('opacity', d => {
        if(d.data.bbrID == selected){
          return 1;
        }
        return d3.polygonArea(d) > area ? 1 : 0
      })

      textLabel.style('opacity', d => {
        if(d.data.bbrID == selected){
          return 1;
        }
        return d3.polygonArea(d) > area ? 1 : 0
      })

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
