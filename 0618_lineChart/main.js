// get csv file
d3.csv('data/movies.csv', type).then(
    res => {
        ready(res)
        // console.log(res)
    }
);
// Data utilities
const parseNA = string => (string === 'NA' ? undefined : string);
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);
function type(d) {
    const date = parseDate(d.release_date);
    return {
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d => d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_year: date.getFullYear(),
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count,
    }
}
// Data selection
function filterData(data) {
    return data.filter(
        d => {
            return (
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}

// 資料清理
function ready(movies) {
    const moviesClean = filterData(movies);
    // console.log(moviesClean);
    const lineChartData = prepareLineChartData(moviesClean);
    console.log(lineChartData);
    setupCanvas(lineChartData);
}
// prepare bar chart
function prepareScatterData(data) {
    // console.log(data);
    return data.sort((a,b)=>b.budget-a.budget).filter((d,i)=>i<100);
}

function prepareLineChartData(data) {
    const groupByYear = d => d.release_year;
    const sumOfRevenue = values => d3.sum(values, d => d.revenue);
    const sumOfRevenueByYear = d3.rollup(data, sumOfRevenue, groupByYear);
    const sumOfBudget = values => d3.sum(values, d => d.budget);
    const sumOfBudgetByYear = d3.rollup(data, sumOfBudget, groupByYear);
    const revenueArray = Array.from(sumOfRevenueByYear).sort((a,b)=>a[0]-b[0]);
    const budgetArray = Array.from(sumOfBudgetByYear).sort((a,b)=>a[0]-b[0]);

    const parseYear = d3.timeParse('%Y');
    //用年份來產生日期時間格式的資料
    const dates = revenueArray.map(d=>parseYear(d[0]));
    const revenueAndBudgetArray = revenueArray.map(d=>d[1])
                                    .concat(budgetArray.map(d=>d[1]));
    const yMax = d3.max(revenueAndBudgetArray);

    //最終資料回傳
    const lineData = {
        series:[
        {
            name:'Revenue',
            color:'dodgerblue',
            values:revenueArray.map(d=>({date:parseYear(d[0]),value:d[1]}))
        },
        {
            name:'Budget',
            color:'darkorange',
            values:budgetArray.map(d=>({date:parseYear(d[0]),value:d[1]}))
        }
        ],
        dates:dates,
        yMax:yMax
        }
        return lineData;

}
    


// 刻度顯示格式轉換
function formatTicks(d){
    return d3.format('~s')(d)
    .replace('M','mil')
    .replace('G','bil')
    .replace('T','tri')
    }
function addLabel(axis,label,x,y){
    axis.selectAll('.tick:last-of-type text')
    .clone()
    .text(label)
    .attr('x',x).attr('y',y)
    .style('text-anchor','start')
    .style('font-weight','bold')
    .style('fill','#555')
}

// setup canvas function
function setupCanvas(lineChartData) {
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = { top: 80, right: 80, bottom: 40, left: 80 };
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);

    const this_svg = d3.select('.line-chart-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height).append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);

    // scale
    // d3.extent find the max & min in revenue
    const xExtent = d3.extent(lineChartData.dates);
    const xScale = d3.scaleTime().domain(xExtent).range([0, chart_width]);
 
    const yScale = d3.scaleLinear().domain([0,lineChartData.yMax]).range([chart_height,0]);
    // 營收最小的放下面，與座標相反

    //line generator
    const lineGen = d3.line()
                    .x(d=>xScale(d.date))
                    .y(d=>yScale(d.value));
    //Draw Line
    const chartGroup = this_svg.append('g').attr('class','line-chart');
    chartGroup.selectAll('.line-series').data(lineChartData.series).enter()
                .append('path')
                .attr('class',d=>`line-series ${d.name.toLowerCase()}`)
                .attr('d',d=>lineGen(d.values))
                .style('fill','none').style('stroke',d=>d.color);

    // // draw scatters
    // this_svg.selectAll('.scatter')
    //         .data(scatterData)
    //         .enter()
    //         .append('circle')
    //         .attr('class','scatter')
    //         .attr('cx', d=>xScale(d.budget))
    //         .attr('cy', d=>yScale(d.revenue))
    //         .attr('r',3)
    //         .style('fill','dodgerblue')
    //         .style('fill-opacity', 0.5)
    // draw header
    const header = this_svg.append('g').attr('class','bar-header')
                        .attr('transform',`translate(0,${-chart_margin.top/2})`)
                        .append('text');
    header.append('tspan').text('Budget vs. Revenue in $US');
    header.append('tspan').text('Top 100 films by budget,2000-2009').attr('x',0).attr('y',20)
            .style('fill','#555').style('font-size','0.8em');

    // tickSizeInner : the length of the tick lines
    // tickSizeOuter : the length of the square ends of the domain path


    //draw X axis
    const xAxis = d3.axisBottom(xScale)
                    .tickSizeOuter(0);
    this_svg.append('g').attr('class','x axis')
    .attr('transform',`translate(0,${chart_height})`).call(xAxis);


    // xAxisDraw.selectAll('text').attr('dy','2em')

    //draw Y axis
    const yAxis = d3.axisLeft(yScale)
                    .ticks(5)
                    .tickFormat(formatTicks)
                    .tickSizeInner(-chart_height)
                    .tickSizeOuter(0);
    this_svg.append('g')
                        .attr('class','y axis')
                        .call(yAxis);

    //Draw series label

    chartGroup.append('g').attr('class','series-labels')
    .selectAll('.series-label').data(lineChartData.series).enter()
    .append('text')
    .attr('x',d=>xScale(d.values[d.values.length-1].date)+5)
    .attr('y',d=>yScale(d.values[d.values.length-1].value))
    .text(d=>d.name)
    .style('dominant-baseline','central')
    .style('font-size','0.7em').style('font-weight','bold')
    .style('fill',d=>d.color);

}

