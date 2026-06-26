// Central chart configuration keeps the restored v1 graphs
const CONFIG = {
    margin: { top: 30, right: 30, bottom: 50, left: 60 },
    colors: {
        accent: "#2563eb", 
        highlight: "#f59e0b",
        secondary: "#94a3b8", 
        tertiary: "#8b5cf6",
        quaternary: "#10b981",
        bg: "#ffffff",
        text: "#475569",
        palette: [
            "#2563eb", 
            "#10b981", 
            "#8b5cf6", 
            "#f43f5e", 
            "#06b6d4", 
            "#f59e0b", 
            "#6366f1", 
            "#84cc16",
            "#ec4899", 
            "#14b8a6" 
        ]
    },
    duration: 1000
};

// Reuse the HTML tooltip if it exists so every chart shares one hover surface.
const tooltip = d3.select("#tooltip").empty()
    ? d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0)
    : d3.select("#tooltip").style("opacity", 0);

function showTooltip(event, content) {
    const tooltipNode = tooltip.node();
    tooltip.transition().duration(200).style("opacity", 1);
    tooltip.html(content);

    // Keep the tooltip inside the viewport during dense heatmap and area hovers.
    const width = tooltipNode.offsetWidth || 180;
    const height = tooltipNode.offsetHeight || 80;
    let left = event.pageX + 15;
    let top = event.pageY - 28;
    if (left + width > window.innerWidth - 20) left = event.pageX - width - 15;
    if (top + height > window.innerHeight + window.scrollY - 20) top = event.pageY - height - 15;

    tooltip.style("left", left + "px").style("top", top + "px");
}

function hideTooltip() {
    tooltip.transition().duration(200).style("opacity", 0);
}


// Shared state lets every graph behave like one coordinated dashboard.
let state = {
    directConsumption: [],
    reallocatedUse: [],
    renewableSources: [],
    activeDataset: "direct", 
    selectedSector: "Total",
    selectedYear: "2023",
    sectors: [],
    rankingSectors: [],
    years: [],
    sources: [],
    parseYear: d3.timeParse("%Y")
};

// Load all source tables before initializing controls or graph layers.
Promise.all([
    d3.csv("DirectConsumption.csv"),
    d3.csv("ReallocatedUse.csv"),
    d3.csv("RenewableSources.csv")
]).then(files => {
    processData(files);
    setupUI();
    renderCharts();
}).catch(err => console.error("Pipeline Failure:", err));

function processData(files) {
    state.directConsumption = files[0].filter(d => d.Industry && String(d.Industry).trim() !== "");
    state.reallocatedUse = files[1].filter(d => d.Industry && String(d.Industry).trim() !== "");
    state.renewableSources = files[2].filter(d => d.Source && String(d.Source).trim() !== "");

    // Column names drive the dropdowns, rankings, and heatmap rows.
    const headers = Object.keys(state.directConsumption[0]);
    state.sectors = headers.slice(1).filter(h => h.trim() !== "");
    state.rankingSectors = state.sectors.filter(s => s !== "Total");
    state.years = state.directConsumption.map(d => String(d.Industry).trim());
    
    // RenewableSources includes summary columns, so the stacked area uses only source columns.
    const headers1c = Object.keys(state.renewableSources[0]);
    const exclude = ["Total", "Percentage", "Adjustment", "Energy from"];
    state.sources = headers1c.slice(1).filter(h => !exclude.some(term => h.includes(term)));
}

function setupUI() {
    // Sector selector controls the trend and restored v1 comparative line chart.
    const picker = d3.select("#sector-picker");
    picker.selectAll("option")
        .data(state.sectors)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
    
    picker.property("value", state.selectedSector);
    picker.on("change", function() {
        state.selectedSector = this.value;
        updateAllCharts();
    });

    // Year slider syncs the ranking, composition indicator, and heatmap focus.
    d3.select("#year-control").on("input", function() {
        state.selectedYear = this.value;
        d3.select("#active-year").text(state.selectedYear);
        updateAllCharts();
    });

    // Dataset toggle keeps v2 behavior while also recoloring the restored heatmap.
    d3.select("#toggle-data").on("click", function() {
        state.activeDataset = state.activeDataset === "direct" ? "reallocated" : "direct";
        d3.select("#toggle-text").text(state.activeDataset === "direct" ? "Direct Consumption" : "Reallocated Use");
        d3.select(this).classed("active", state.activeDataset === "direct");
        updateAllCharts();
    });

    window.addEventListener("resize", debounce(() => renderCharts(), 180));
}

function updateAllCharts() {
    // Update controls and card emphasis before redrawing the coordinated charts.
    const isTotal = state.selectedSector === "Total";
    d3.select("#sector-picker").classed("highlighted", !isTotal);
    
    // Highlight chart cards when a specific sector is focused
    d3.selectAll(".chart-card").classed("highlighted", !isTotal);
    
    updateTrendChart();
    updateGapChart();
    updateRankingChart();
    updateCompositionChart();
    updateHeatmap();
    updateSourceBreakdownChart();
}

function renderCharts() {
    d3.selectAll(".chart-container").selectAll("*").remove();
    initGapChart();
    initTrendChart();
    initRankingChart();
    initCompositionChart();
    initHeatmap();
    initSourceBreakdownChart();
}

function debounce(callback, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), wait);
    };
}

// Shared update helper used by hover/click interactions from the restored v1 graphs.
function setDashboardFocus({ sector = state.selectedSector, year = state.selectedYear } = {}) {
    state.selectedSector = sector;
    state.selectedYear = year;
    d3.select("#sector-picker").property("value", state.selectedSector);
    d3.select("#year-control").property("value", state.selectedYear);
    d3.select("#active-year").text(state.selectedYear);
    updateAllCharts();
}

// --- V1 Graph Restored: Comparative Line Chart (Direct vs Reallocated) ---
let gapSVG, xGap, yGap, gapLine;

function initGapChart() {
    const container = d3.select("#efficiency-gap");
    const width = container.node().getBoundingClientRect().width - CONFIG.margin.left - CONFIG.margin.right;
    const height = container.node().getBoundingClientRect().height - CONFIG.margin.top - CONFIG.margin.bottom;

    gapSVG = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + CONFIG.margin.left + CONFIG.margin.right} ${height + CONFIG.margin.top + CONFIG.margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

    xGap = d3.scaleTime().range([0, width]);
    yGap = d3.scaleLinear().range([height, 0]);
    gapLine = d3.line().x(d => xGap(d.year)).y(d => yGap(d.val)).curve(d3.curveMonotoneX);

    gapSVG.append("path").attr("class", "line-direct");
    gapSVG.append("path").attr("class", "line-reallocated");
    gapSVG.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    gapSVG.append("g").attr("class", "y-axis");
    gapSVG.append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", height + 42).attr("text-anchor", "middle").text("Year");
    gapSVG.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", -45).attr("x", -height / 2).attr("text-anchor", "middle").text("Mtoe");

    const legend = gapSVG.append("g").attr("class", "legend").attr("transform", `translate(${Math.max(width - 210, 0)},0)`);
    [
        { label: "Direct Use", color: CONFIG.colors.accent, dash: null },
        { label: "Reallocated Use", color: "#f43f5e", dash: "7 6" }
    ].forEach((item, i) => {
        const row = legend.append("g").attr("transform", `translate(0,${i * 24})`);
        row.append("line").attr("x1", 0).attr("x2", 28).attr("y1", 8).attr("y2", 8).style("stroke", item.color).style("stroke-width", 4).style("stroke-dasharray", item.dash);
        row.append("text").attr("x", 36).attr("y", 12).style("font-size", "12px").style("fill", CONFIG.colors.text).style("font-weight", 700).text(item.label);
    });

    updateGapChart();
}

function updateGapChart() {
    const makeSeries = (rows, key) => rows.map(d => ({
        year: state.parseYear(String(d.Industry).trim()),
        yearText: String(d.Industry).trim(),
        val: parseFloat(d[key]) || 0
    })).filter(d => d.year);

    const direct = makeSeries(state.directConsumption, state.selectedSector);
    const reallocated = makeSeries(state.reallocatedUse, state.selectedSector);
    const allPoints = [...direct, ...reallocated];

    xGap.domain(d3.extent(allPoints, d => d.year));
    yGap.domain([0, (d3.max(allPoints, d => d.val) || 1) * 1.1]);

    gapSVG.select(".x-axis").transition().duration(CONFIG.duration).call(d3.axisBottom(xGap).ticks(8));
    gapSVG.select(".y-axis").transition().duration(CONFIG.duration).call(d3.axisLeft(yGap).tickFormat(d3.format(".1f")));

    gapSVG.select(".line-direct").datum(direct).transition().duration(CONFIG.duration).attr("d", gapLine);
    gapSVG.select(".line-reallocated").datum(reallocated).transition().duration(CONFIG.duration).attr("d", gapLine);

    bindGapDots(".dot-direct", direct, "Direct Use", CONFIG.colors.accent);
    bindGapDots(".dot-reallocated", reallocated, "Reallocated Use", "#f43f5e");
}

function bindGapDots(selector, data, label, color) {
    gapSVG.selectAll(selector)
        .data(data, d => d.yearText)
        .join("circle")
        .attr("class", selector.slice(1))
        .attr("cx", d => xGap(d.year))
        .attr("cy", d => yGap(d.val))
        .attr("r", d => d.yearText === state.selectedYear ? 6 : 4)
        .style("fill", d => d.yearText === state.selectedYear ? "#fff" : color)
        .style("stroke", color)
        .style("stroke-width", 2)
        .style("opacity", d => d.yearText === state.selectedYear ? 1 : 0.55)
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("r", 8).style("opacity", 1);
            showTooltip(event, `<strong>${label}</strong><br>${state.selectedSector}<br>Year: ${d.yearText}<br>Value: ${d.val.toFixed(3)} Mtoe`);
        })
        .on("mouseout", (event, d) => {
            d3.select(event.currentTarget).attr("r", d.yearText === state.selectedYear ? 6 : 4).style("opacity", d.yearText === state.selectedYear ? 1 : 0.55);
            hideTooltip();
        })
        .on("click", (event, d) => setDashboardFocus({ year: d.yearText }));
}

// --- Chart 1: Trend Analysis (Area Gradient) ---
let trendSVG, xTrend, yTrend, trendLine, trendArea;

function initTrendChart() {
    const container = d3.select("#trend-analysis");
    const width = container.node().getBoundingClientRect().width - CONFIG.margin.left - CONFIG.margin.right;
    const height = container.node().getBoundingClientRect().height - CONFIG.margin.top - CONFIG.margin.bottom;

    trendSVG = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + CONFIG.margin.left + CONFIG.margin.right} ${height + CONFIG.margin.top + CONFIG.margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

    // Gradients
    const defs = trendSVG.append("defs");
    const grad = defs.append("linearGradient")
        .attr("id", "trend-grad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", CONFIG.colors.accent).attr("stop-opacity", 0.2);
    grad.append("stop").attr("offset", "100%").attr("stop-color", CONFIG.colors.accent).attr("stop-opacity", 0);

    xTrend = d3.scaleTime().range([0, width]);
    yTrend = d3.scaleLinear().range([height, 0]);

    trendLine = d3.line().x(d => xTrend(d.year)).y(d => yTrend(d.val)).curve(d3.curveCatmullRom.alpha(0.5));
    trendArea = d3.area().x(d => xTrend(d.year)).y0(height).y1(d => yTrend(d.val)).curve(d3.curveCatmullRom.alpha(0.5));

    trendSVG.append("path").attr("class", "area-path");
    trendSVG.append("path").attr("class", "line-path").style("fill", "none").style("stroke-width", 4);

    trendSVG.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    trendSVG.append("g").attr("class", "y-axis");

    // Year Indicator Line
    trendSVG.append("line")
        .attr("class", "year-indicator")
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", CONFIG.colors.accent)
        .style("stroke-width", 2)
        .style("stroke-dasharray", "6,4")
        .style("opacity", 0);

    // Overlay for click-to-select-year
    trendSVG.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "transparent")
        .on("click", (e) => {
            const xVal = xTrend.invert(d3.pointer(e)[0]);
            state.selectedYear = String(xVal.getFullYear());
            d3.select("#year-control").property("value", state.selectedYear);
            d3.select("#active-year").text(state.selectedYear);
            updateAllCharts();
        });

    updateTrendChart();
}

function updateTrendChart() {
    const sourceData = state.activeDataset === "direct" ? state.directConsumption : state.reallocatedUse;
    const isTotal = state.selectedSector === "Total";
    const activeColor = isTotal ? CONFIG.colors.accent : CONFIG.colors.highlight;
    
    // Update Gradient color
    trendSVG.select("#trend-grad stop").transition().duration(CONFIG.duration).attr("stop-color", activeColor);

    // Use "Industry" column for years in DirectConsumption/ReallocatedUse.
    const data = sourceData.map(d => ({
        year: state.parseYear(String(d.Industry).trim()),
        val: parseFloat(d[state.selectedSector]) || 0
    })).filter(d => d.year !== null);

    xTrend.domain(d3.extent(data, d => d.year));
    yTrend.domain([0, d3.max(data, d => d.val) * 1.1 || 1]);

    trendSVG.select(".x-axis").transition().duration(CONFIG.duration).call(d3.axisBottom(xTrend).ticks(8));
    trendSVG.select(".y-axis").transition().duration(CONFIG.duration).call(d3.axisLeft(yTrend).tickFormat(d3.format(".1f")));

    trendSVG.select(".area-path").datum(data)
        .transition().duration(CONFIG.duration)
        .attr("d", trendArea)
        .style("fill", "url(#trend-grad)");

    trendSVG.select(".line-path").datum(data)
        .transition().duration(CONFIG.duration)
        .attr("d", trendLine)
        .style("stroke", activeColor);

    const dots = trendSVG.selectAll(".dot").data(data, d => d.year);
    
    dots.join("circle")
        .attr("class", "dot")
        .transition().duration(CONFIG.duration)
        .attr("cx", d => xTrend(d.year))
        .attr("cy", d => yTrend(d.val))
        .attr("r", d => String(d.year.getFullYear()) === state.selectedYear ? 7 : 4)
        .style("fill", d => String(d.year.getFullYear()) === state.selectedYear ? "#fff" : activeColor)
        .style("stroke", activeColor)
        .style("stroke-width", 2);

    trendSVG.selectAll(".dot")
        .on("mouseover", (e, d) => {
            d3.select(e.currentTarget).transition().attr("r", 8).style("fill", "#fff");
            showTooltip(e, `<strong>${state.selectedSector}</strong><br>Year: ${d.year.getFullYear()}<br>Value: ${d.val.toFixed(3)} Mtoe`);
        })
        .on("mouseout", (e, d) => {
            const isSelected = String(d.year.getFullYear()) === state.selectedYear;
            d3.select(e.currentTarget).transition().attr("r", isSelected ? 6 : 3.5).style("fill", isSelected ? "#fff" : CONFIG.colors.accent);
            hideTooltip();
        })
        .on("click", (e, d) => {
            state.selectedYear = String(d.year.getFullYear());
            d3.select("#year-control").property("value", state.selectedYear);
            d3.select("#active-year").text(state.selectedYear);
            updateAllCharts();
        });

    // Update Year Indicator
    const selectedDate = state.parseYear(state.selectedYear);
    trendSVG.select(".year-indicator")
        .transition().duration(CONFIG.duration)
        .attr("x1", xTrend(selectedDate))
        .attr("x2", xTrend(selectedDate))
        .style("opacity", 1);
}

// --- Chart 2: Ranking Analysis (Horizontal Progress Bars) ---
let rankSVG, xRank, yRank;

function initRankingChart() {
    const container = d3.select("#ranking-analysis");
    const width = container.node().getBoundingClientRect().width - 120;
    const height = container.node().getBoundingClientRect().height - CONFIG.margin.top - CONFIG.margin.bottom;

    rankSVG = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + 120} ${height + CONFIG.margin.top + CONFIG.margin.bottom}`)
        .append("g")
        .attr("transform", `translate(100,${CONFIG.margin.top})`);

    xRank = d3.scaleLinear().range([0, width]);
    yRank = d3.scaleBand().range([0, height]).padding(0.4);

    rankSVG.append("g").attr("class", "y-axis");
    
    // Add a grid for x-axis
    rankSVG.append("g").attr("class", "x-grid");

    updateRankingChart();
}

function updateRankingChart() {
    const source = state.activeDataset === "direct" ? state.directConsumption : state.reallocatedUse;
    // Use "Industry" column for years
    const yearRow = source.find(d => d.Industry === state.selectedYear);
    if (!yearRow) return;

    const data = state.rankingSectors.map(s => ({
        name: s,
        val: parseFloat(yearRow[s]) || 0
    })).sort((a, b) => b.val - a.val);

    xRank.domain([0, d3.max(data, d => d.val) || 1]);
    yRank.domain(data.map(d => d.name));

    rankSVG.select(".y-axis").transition().duration(CONFIG.duration).call(d3.axisLeft(yRank).tickSize(0));
    rankSVG.select(".y-axis").selectAll("text").style("font-size", "10px").attr("dx", "-10px").style("font-weight", "600");

    const bars = rankSVG.selectAll(".bar-group").data(data, d => d.name);
    
    const barsEnter = bars.enter().append("g").attr("class", "bar-group");
    
    barsEnter.append("rect")
        .attr("class", "bar-bg")
        .attr("x", 0)
        .attr("y", d => yRank(d.name))
        .attr("height", yRank.bandwidth())
        .attr("width", xRank.range()[1])
        .style("fill", "#f1f5f9")
        .attr("rx", 6);

    barsEnter.append("rect")
        .attr("class", "bar-fill")
        .attr("x", 0)
        .attr("y", d => yRank(d.name))
        .attr("height", yRank.bandwidth())
        .attr("width", 0)
        .style("fill", CONFIG.colors.secondary)
        .attr("rx", 6);

    const barsUpdate = barsEnter.merge(bars);

    barsUpdate.select(".bar-fill")
        .transition().duration(CONFIG.duration)
        .attr("y", d => yRank(d.name))
        .attr("height", yRank.bandwidth())
        .attr("width", d => xRank(d.val))
        .style("fill", d => {
            if (d.name === state.selectedSector) return CONFIG.colors.highlight;
            return state.selectedSector === "Total" ? CONFIG.colors.accent : CONFIG.colors.secondary;
        })
        .style("opacity", d => (state.selectedSector === "Total" || d.name === state.selectedSector) ? 1 : 0.4);

    barsUpdate.select(".bar-bg")
        .transition().duration(CONFIG.duration)
        .attr("y", d => yRank(d.name))
        .attr("height", yRank.bandwidth())
        .style("opacity", d => (state.selectedSector === "Total" || d.name === state.selectedSector) ? 1 : 0.2);

    rankSVG.select(".y-axis").selectAll("text")
        .transition().duration(CONFIG.duration)
        .style("fill", d => d === state.selectedSector ? CONFIG.colors.highlight : CONFIG.colors.text)
        .style("font-weight", d => d === state.selectedSector ? "800" : "600")
        .style("font-size", d => d === state.selectedSector ? (state.selectedSector === "Total" ? "10px" : "12px") : "10px");

    barsUpdate.on("mouseover", (e, d) => {
        d3.select(e.currentTarget).select(".bar-fill").style("filter", "brightness(1.1)");
        showTooltip(e, `<strong>${d.name}</strong><br>Value: ${d.val.toFixed(3)} Mtoe`);
    }).on("mouseout", (e) => {
        d3.select(e.currentTarget).select(".bar-fill").style("filter", "none");
        hideTooltip();
    })
    .on("click", (e, d) => {
        state.selectedSector = d.name;
        d3.select("#sector-picker").property("value", state.selectedSector);
        updateAllCharts();
    });

    bars.exit().remove();
}

// --- Chart 3: Composition Matrix (Stacked Area) ---
let compSVG, xComp, yComp, compArea, compColor, compSeries, compData;

function initCompositionChart() {
    const container = d3.select("#composition-analysis");
    const width = container.node().getBoundingClientRect().width - CONFIG.margin.left - CONFIG.margin.right;
    const height = container.node().getBoundingClientRect().height - CONFIG.margin.top - CONFIG.margin.bottom;

    compSVG = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + CONFIG.margin.left + CONFIG.margin.right} ${height + CONFIG.margin.top + CONFIG.margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

    xComp = d3.scaleTime().range([0, width]);
    yComp = d3.scaleLinear().range([height, 0]);
    compColor = d3.scaleOrdinal().domain(state.sources).range(CONFIG.colors.palette);

    compArea = d3.area()
        .x(d => xComp(d.data.year))
        .y0(d => yComp(d[0]))
        .y1(d => yComp(d[1]))
        .curve(d3.curveCatmullRom.alpha(0.5));

    compSVG.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    compSVG.append("g").attr("class", "y-axis");
    
    // Year Indicator Line
    compSVG.append("line")
        .attr("class", "year-indicator")
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", CONFIG.colors.accent)
        .style("stroke-width", 2)
        .style("stroke-dasharray", "6,4")
        .style("opacity", 0);

    updateCompositionChart();
}

function updateCompositionChart() {
    // RenewableSources uses "Source" as the year column.
    compData = state.renewableSources.map(d => {
        const obj = { year: state.parseYear(String(d.Source).trim()) };
        state.sources.forEach(s => obj[s] = parseFloat(d[s]) || 0);
        return obj;
    }).filter(d => d.year !== null);

    compSeries = d3.stack().keys(state.sources)(compData);

    xComp.domain(d3.extent(compData, d => d.year));
    yComp.domain([0, d3.max(compSeries, s => d3.max(s, d => d[1])) || 1]);

    compSVG.select(".x-axis").transition().duration(CONFIG.duration).call(d3.axisBottom(xComp).ticks(8));
    compSVG.select(".y-axis").transition().duration(CONFIG.duration).call(d3.axisLeft(yComp));

    const sourcePaths = compSVG.selectAll(".source-path").data(compSeries, d => d.key);

    sourcePaths.join("path")
        .attr("class", "source-path")
        .transition().duration(CONFIG.duration)
        .attr("d", compArea)
        .style("fill", d => compColor(d.key))
        .style("opacity", 0.85);

    compSVG.selectAll(".source-path")
        .on("mouseover", (e, d) => {
            d3.select(e.currentTarget).style("opacity", 1).style("filter", "brightness(1.1)");
            showTooltip(e, `<strong>${d.key}</strong>`);
        })
        .on("mousemove", (e, d) => {
            const xVal = xComp.invert(d3.pointer(e)[0]);
            const bisect = d3.bisector(d => d.year).left;
            const idx = Math.min(compData.length - 1, bisect(compData, xVal));
            const dRow = compData[idx];
            if(dRow) {
                showTooltip(e, `<strong>${d.key}</strong><br>Year: ${dRow.year.getFullYear()}<br>Value: ${dRow[d.key].toFixed(3)} Mtoe`);

                // V1-style scrubbing: hovering renewable layers syncs the dashboard year.
                const hoveredYear = String(dRow.year.getFullYear());
                if (hoveredYear !== state.selectedYear) {
                    state.selectedYear = hoveredYear;
                    d3.select("#year-control").property("value", state.selectedYear);
                    d3.select("#active-year").text(state.selectedYear);
                    updateTrendChart();
                    updateGapChart();
                    updateRankingChart();
                    updateHeatmap();
                    updateSourceBreakdownChart();
                    compSVG.select(".year-indicator")
                        .attr("x1", xComp(dRow.year))
                        .attr("x2", xComp(dRow.year))
                        .style("opacity", 1);
                }
            }
        })
        .on("mouseout", (e) => {
            d3.select(e.currentTarget).style("opacity", 0.85).style("filter", "none");
            hideTooltip();
        })
        .on("click", (e, d) => {
            const xVal = xComp.invert(d3.pointer(e)[0]);
            state.selectedYear = String(xVal.getFullYear());
            d3.select("#year-control").property("value", state.selectedYear);
            d3.select("#active-year").text(state.selectedYear);
            updateAllCharts();
        });

    // Update Year Indicator
    const selectedDate = state.parseYear(state.selectedYear);
    compSVG.select(".year-indicator")
        .transition().duration(CONFIG.duration)
        .attr("x1", xComp(selectedDate))
        .attr("x2", xComp(selectedDate))
        .style("opacity", 1);
}

// --- V1 Graph Restored: Energy Intensity Heatmap ---
let heatSVG, xHeat, yHeat, heatColorDirect, heatColorReallocated, heatWidth, heatHeight;

function initHeatmap() {
    const container = d3.select("#energy-heatmap");
    heatWidth = container.node().getBoundingClientRect().width - 160;
    heatHeight = container.node().getBoundingClientRect().height - CONFIG.margin.top - 80;

    heatSVG = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${heatWidth + 160} ${heatHeight + CONFIG.margin.top + 80}`)
        .append("g")
        .attr("transform", `translate(140,${CONFIG.margin.top})`);

    xHeat = d3.scaleBand().domain(state.years).range([0, heatWidth]).padding(0.05);
    yHeat = d3.scaleBand().domain(state.rankingSectors).range([0, heatHeight]).padding(0.05);

    const maxDirect = d3.max(flattenHeatData(state.directConsumption), d => d.val) || 1;
    const maxReallocated = d3.max(flattenHeatData(state.reallocatedUse), d => d.val) || 1;
    const maxValue = Math.max(maxDirect, maxReallocated);
    heatColorDirect = d3.scaleSequential(d3.interpolateBlues).domain([0, maxValue]);
    heatColorReallocated = d3.scaleSequential(d3.interpolateReds).domain([0, maxValue]);

    heatSVG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${heatHeight})`)
        .call(d3.axisBottom(xHeat).tickValues(state.years.filter((d, i) => i % 2 === 0)))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    heatSVG.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yHeat).tickFormat(d => d.length > 24 ? `${d.slice(0, 21)}...` : d));

    heatSVG.append("text").attr("class", "axis-label").attr("x", heatWidth / 2).attr("y", heatHeight + 62).attr("text-anchor", "middle").text("Year");
    heatSVG.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", -118).attr("x", -heatHeight / 2).attr("text-anchor", "middle").text("Sector");

    updateHeatmap();
}

function flattenHeatData(sourceData) {
    const cells = [];
    sourceData.forEach(row => {
        const year = String(row.Industry).trim();
        state.rankingSectors.forEach(sector => {
            cells.push({ year, sector, val: parseFloat(row[sector]) || 0 });
        });
    });
    return cells;
}

function updateHeatmap() {
    const source = state.activeDataset === "direct" ? state.directConsumption : state.reallocatedUse;
    const color = state.activeDataset === "direct" ? heatColorDirect : heatColorReallocated;
    const cells = flattenHeatData(source);

    heatSVG.selectAll(".heat-cell")
        .data(cells, d => `${d.year}:${d.sector}`)
        .join("rect")
        .attr("class", "heat-cell")
        .attr("x", d => xHeat(d.year))
        .attr("y", d => yHeat(d.sector))
        .attr("width", xHeat.bandwidth())
        .attr("height", yHeat.bandwidth())
        .style("fill", d => color(d.val))
        .style("opacity", d => {
            const active = d.year === state.selectedYear || d.sector === state.selectedSector;
            return state.selectedSector === "Total" ? 0.95 : (active ? 1 : 0.45);
        })
        .on("mouseover", (event, d) => {
            showTooltip(event, `<strong>${d.sector}</strong><br>Year: ${d.year}<br>Value: ${d.val.toFixed(3)} Mtoe`);

            // V1 master-control behavior: hovering a cell syncs the selected sector and year.
            state.selectedSector = d.sector;
            state.selectedYear = d.year;
            d3.select("#sector-picker").property("value", state.selectedSector);
            d3.select("#year-control").property("value", state.selectedYear);
            d3.select("#active-year").text(state.selectedYear);
            updateTrendChart();
            updateGapChart();
            updateRankingChart();
            updateCompositionChart();
            updateSourceBreakdownChart();
            heatSVG.selectAll(".heat-cell").style("opacity", cell => (cell.year === d.year || cell.sector === d.sector) ? 1 : 0.35);
        })
        .on("mouseout", () => {
            hideTooltip();
            updateHeatmap();
        })
        .on("click", (event, d) => setDashboardFocus({ sector: d.sector, year: d.year }));
}

// --- Chart 6: Selected Year Source Mix ---
let sourceBreakdownSVG, sourceBreakdownGroup, sourceBreakdownLegend, sourceBreakdownRadius, sourceBreakdownColor;

function initSourceBreakdownChart() {
    const container = d3.select("#source-breakdown");
    const bounds = container.node().getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    sourceBreakdownRadius = Math.min(width * 0.34, height * 0.42);

    sourceBreakdownSVG = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

    sourceBreakdownGroup = sourceBreakdownSVG.append("g")
        .attr("transform", `translate(${Math.max(sourceBreakdownRadius + 22, width * 0.33)},${height / 2})`);

    sourceBreakdownLegend = sourceBreakdownSVG.append("g")
        .attr("class", "source-legend")
        .attr("transform", `translate(${Math.max(width * 0.58, sourceBreakdownRadius * 2 + 48)},${Math.max(22, height * 0.16)})`);

    sourceBreakdownColor = d3.scaleOrdinal()
        .domain(state.sources)
        .range(CONFIG.colors.palette);

    updateSourceBreakdownChart();
}

function getSourceBreakdownData() {
    const row = state.renewableSources.find(d => String(d.Source).trim() === state.selectedYear);
    if (!row) return [];

    const sorted = state.sources
        .map(source => ({
            name: source,
            val: parseFloat(row[source]) || 0
        }))
        .filter(d => d.val > 0)
        .sort((a, b) => b.val - a.val);

    const topSources = sorted.slice(0, 7);
    const otherTotal = d3.sum(sorted.slice(7), d => d.val);
    if (otherTotal > 0) {
        topSources.push({ name: "Other sources", val: otherTotal });
    }

    return topSources;
}

function updateSourceBreakdownChart() {
    if (!sourceBreakdownSVG) return;

    const data = getSourceBreakdownData();
    const pie = d3.pie()
        .value(d => d.val)
        .sort(null);
    const arc = d3.arc()
        .innerRadius(sourceBreakdownRadius * 0.58)
        .outerRadius(sourceBreakdownRadius);
    const labelArc = d3.arc()
        .innerRadius(sourceBreakdownRadius * 0.72)
        .outerRadius(sourceBreakdownRadius * 0.72);

    sourceBreakdownGroup.selectAll(".breakdown-slice")
        .data(pie(data), d => d.data.name)
        .join(
            enter => enter.append("path")
                .attr("class", "breakdown-slice")
                .attr("d", arc)
                .style("fill", d => sourceBreakdownColor(d.data.name))
                .style("stroke", "#fff")
                .style("stroke-width", 2)
                .style("opacity", 0)
                .call(enter => enter.transition().duration(CONFIG.duration).style("opacity", 0.92)),
            update => update.transition().duration(CONFIG.duration).attr("d", arc),
            exit => exit.transition().duration(250).style("opacity", 0).remove()
        );

    sourceBreakdownGroup.selectAll(".breakdown-slice")
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).style("opacity", 1).style("filter", "brightness(1.08)");
            showTooltip(event, `<strong>${d.data.name}</strong><br>Year: ${state.selectedYear}<br>Value: ${d.data.val.toFixed(3)} Mtoe`);
        })
        .on("mouseout", event => {
            d3.select(event.currentTarget).style("opacity", 0.92).style("filter", "none");
            hideTooltip();
        });

    const total = d3.sum(data, d => d.val);
    const center = sourceBreakdownGroup.selectAll(".breakdown-center").data([total]);
    const centerEnter = center.enter().append("g").attr("class", "breakdown-center");
    centerEnter.append("text").attr("class", "center-value").attr("text-anchor", "middle").attr("dy", "-0.1em");
    centerEnter.append("text").attr("class", "center-label").attr("text-anchor", "middle").attr("dy", "1.35em").text(state.selectedYear);

    center.merge(centerEnter).select(".center-value")
        .text(d => d3.format(".2f")(d));
    center.merge(centerEnter).select(".center-label")
        .text(`${state.selectedYear} Mtoe`);

    sourceBreakdownGroup.selectAll(".slice-label")
        .data(pie(data).filter(d => (d.endAngle - d.startAngle) > 0.28), d => d.data.name)
        .join("text")
        .attr("class", "slice-label")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(d => `${Math.round((d.data.val / total) * 100)}%`);

    const legendRows = sourceBreakdownLegend.selectAll(".legend-row")
        .data(data, d => d.name)
        .join(
            enter => {
                const row = enter.append("g").attr("class", "legend-row");
                row.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2);
                row.append("text").attr("class", "legend-name").attr("x", 16).attr("y", 9);
                row.append("text").attr("class", "legend-value").attr("x", 16).attr("y", 25);
                return row;
            },
            update => update,
            exit => exit.remove()
        )
        .attr("transform", (d, i) => `translate(0,${i * 38})`);

    legendRows.select("rect").style("fill", d => sourceBreakdownColor(d.name));
    legendRows.select(".legend-name")
        .text(d => d.name.length > 28 ? `${d.name.slice(0, 25)}...` : d.name);
    legendRows.select(".legend-value")
        .text(d => `${d3.format(".2f")(d.val)} Mtoe`);
}
