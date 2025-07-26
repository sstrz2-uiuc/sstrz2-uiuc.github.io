import * as d3 from 'd3';
import { annotation, annotationCalloutCircle, annotationCalloutElbow, annotationLabel, annotationCallout } from 'd3-svg-annotation';

let appState = {
    currentScene: 0,
    masterData: [],
    topDishes: {},
    viewMode: 'popularity', 
    highlightedDish: null,
    filterKeyword: '',
    showAllScenes: false,
    isUpdating: false // Add flag to prevent multiple simultaneous updates
};

const scenes = [
    {
        title: "Post-War Beverages: Coffee Culture Emerges (1940-1955)",
        description: "In the post-World War II era, coffee solidified its place as America's dominant beverage, driven by economic prosperity and cultural shifts. Traditional drinks adapted to evolving consumer preferences.",
        dateRange: [1940, 1955],
        era: "postwar",
        keyInsights: [
            {
                text: "Coffee dominates post-war America",
                detail: "Coffee begins to appear more frequently, establishing the foundation of American coffee culture"
            },
            {
                text: "Traditional drinks remain affordable",
                detail: "Tea and milk maintain consistent, low pricing throughout this period"
            }
        ]
    },
    {
        title: "Mid-Century Cocktail Culture (1955-1975)",
        description: "The mid-20th century witnessed the flourishing of cocktail culture, with mixed drinks gaining prominence as symbols of social status and leisure, reflecting a more sophisticated and experimental drinking scene.",
        dateRange: [1955, 1975],
        era: "midcentury_shift",
        keyInsights: [
            {
                text: "Cocktail culture peaks",
                detail: "Mixed drinks like Manhattan and Whiskey Cocktails reach their golden age"
            },
            {
                text: "Price premiums emerge",
                detail: "Alcoholic beverages command higher prices, reflecting status consumption"
            }
        ]
    },
    {
        title: "Beverage Diversity: Modern Drinking Habits (1975-1990)",
        description: "The late 20th century brought a significant diversification in American beverage choices. Influences from global cuisines, a burgeoning interest in specialty and artisanal options, and increased health consciousness reshaped drinking habits.",
        dateRange: [1975, 1990],
        era: "latecentury_trends",
        keyInsights: [
            {
                text: "Beverage specialization begins",
                detail: "Variety increases as consumers seek premium and specialized options"
            },
            {
                text: "Price stratification",
                detail: "Clear price tiers emerge between basic and premium beverage options"
            }
        ]
    }
];

const margin = { top: 60, right: 200, bottom: 120, left: 80 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#main-chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const colors = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemeSet3));

Promise.all([
    d3.csv("data/Dish.csv"),
    d3.csv("data/Menu.csv"),
    d3.csv("data/MenuItem.csv"),
    d3.csv("data/MenuPage.csv")
]).then(function([dishes, menus, menuItems, menuPages]) {
    
    const dishMap = new Map(dishes.map(d => [+d.id, d]));
    const menuMap = new Map(menus.map(m => [+m.id, m]));
    const menuPageMap = new Map(menuPages.map(mp => [+mp.id, mp]));
    
    function isBeverage(dishName) {
        const name = dishName.toLowerCase();
        
        const foodExclusions = [
            'shrimp cocktail', 'lobster cocktail', 'crab cocktail', 'oyster cocktail',
            'clam cocktail', 'seafood cocktail', 'fruit cocktail', 'jumbo shrimp cocktail'
        ];
        
        if (foodExclusions.some(exclusion => name.includes(exclusion))) {
            return false;
        }
        
        const beverageKeywords = [
            'coffee', 'tea', 'milk', 'wine', 'beer', 'whiskey', 'gin', 'rum', 'vodka', 
            'bourbon', 'brandy', 'cocktail', 'punch', 'soda', 'water', 'juice', 
            'champagne', 'ale', 'lager', 'port', 'sherry', 'cognac', 'liqueur',
            'manhattan', 'martini', 'highball', 'toddy', 'negus', 'julep', 'flip',
            'cordial', 'bitters', 'absinthe', 'vermouth', 'kirsch', 'chartreuse',
            'benedictine', 'drambuie', 'cointreau', 'curacao', 'rye', 'scotch'
        ];
        
        return beverageKeywords.some(keyword => name.includes(keyword));
    }

    const dishYearData = new Map();
    
    menuItems.forEach(mi => {
        const price = parseFloat(mi.price);
        if (isNaN(price) || price <= 0 || !mi.dish_id || !mi.menu_page_id) return;
        
        const dish = dishMap.get(+mi.dish_id);
        const menuPage = menuPageMap.get(+mi.menu_page_id);
        const menu = menuPage ? menuMap.get(+menuPage.menu_id) : null;
        
        if (!dish || !menu || !menu.date) return;
        
        const dishName = dish.name;
        
        if (!isBeverage(dishName)) return;
        
        const year = new Date(menu.date).getFullYear();
        if (isNaN(year) || year < 1940 || year > 1990) return;
        
        const key = `${dishName}-${year}`;
        
        if (!dishYearData.has(key)) {
            dishYearData.set(key, {
                dishName: dishName,
                year: year,
                count: 0,
                prices: []
            });
        }
        
        const entry = dishYearData.get(key);
        entry.count += 1;
        entry.prices.push(price);
    });
    
    appState.masterData = Array.from(dishYearData.values()).map(d => ({
        dishName: d.dishName,
        year: d.year,
        count: d.count,
        avgPrice: d3.mean(d.prices),
        price: d3.mean(d.prices) // Alias for compatibility
    }));
    
    const yearCounts = d3.rollup(appState.masterData, v => d3.sum(v, d => d.count), d => d.year);
    console.log('Data distribution by year:', Array.from(yearCounts.entries()).sort((a,b) => a[0] - b[0]));
    
    const dataAfter1940 = Array.from(yearCounts.entries()).filter(([year, count]) => year > 1940);
    console.log('Data after 1940:', dataAfter1940);
    
    const minDataThreshold = 5; 
    const validYears = new Set(
        Array.from(yearCounts.entries())
            .filter(([year, count]) => count >= minDataThreshold)
            .map(([year, count]) => year)
    );
    
    appState.masterData = appState.masterData.filter(d => validYears.has(d.year));
    
    scenes.forEach(scene => {
        const [startYear, endYear] = scene.dateRange;
        const eraData = appState.masterData.filter(d => d.year >= startYear && d.year <= endYear);
        
        const beverageTotals = d3.rollup(eraData, 
            v => d3.sum(v, d => d.count), 
            d => d.dishName
        );
        
        const topBeverageNames = Array.from(beverageTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(d => d[0]);
        
        appState.topDishes[scene.era] = topBeverageNames.map(beverageName => {
            const beverageYearlyData = [];
            const rawYearlyData = [];
            
            for (let year = startYear; year <= endYear; year++) {
                const entry = eraData.find(d => d.dishName === beverageName && d.year === year);
                const count = entry ? entry.count : 0;
                const avgPrice = entry ? entry.avgPrice : 0;
                
                beverageYearlyData.push({
                    year: year,
                    count: count,
                    avgPrice: avgPrice || 0
                });
                rawYearlyData.push(count);
            }
            
            const normalizedData = normalizeData(beverageYearlyData, rawYearlyData);
            
            return {
                dishName: beverageName,
                data: normalizedData,
                totalCount: d3.sum(normalizedData, d => d.count),
                avgPrice: d3.mean(normalizedData, d => d.avgPrice).toFixed(2)
            };
        }).filter(beverage => beverage.totalCount > 0); 
    });
    
    console.log('Top beverages by era:', appState.topDishes);
    updateScene(0);
    
}).catch(error => {
    console.error('Error loading data:', error);
});

function applySmoothing(data) {
    const smoothed = data.map((d, i) => {
        if (i === 0 || i === data.length - 1) {
            return { ...d };
        }
        
        const prev = data[i - 1].count || 0;
        const curr = d.count || 0;
        const next = data[i + 1].count || 0;
        
        const smoothedCount = Math.round((prev * 0.2 + curr * 0.6 + next * 0.2));
        
        return {
            ...d,
            count: smoothedCount
        };
    });
    
    return smoothed;
}

function normalizeData(dishYearlyData, rawYearlyData) {
    const sortedValues = [...rawYearlyData].sort((a, b) => a - b);
    const p75 = d3.quantile(sortedValues, 0.75); 
    const p90 = d3.quantile(sortedValues, 0.90); 
    
    const cap = Math.max(p75 * 2, p90 * 0.8);
    
    const cappedData = dishYearlyData.map(d => {
        let adjustedCount = d.count;
        
        if (adjustedCount > cap) {
            adjustedCount = cap + Math.sqrt(adjustedCount - cap); 
        }
        
        if (d.count > 0 && adjustedCount < 1) {
            adjustedCount = 1;
        }
        
        return {
            ...d,
            count: Math.round(adjustedCount)
        };
    });
    
    return cappedData;
}

function updateScene(sceneIndex) {
    if (appState.isUpdating) return; // Prevent multiple simultaneous updates
    
    if (sceneIndex < 0 || sceneIndex >= scenes.length) {
        appState.isUpdating = false;
        return;
    }
    
    appState.isUpdating = true;
    
    // Disable navigation buttons during update
    document.getElementById("prev-btn").disabled = true;
    document.getElementById("next-btn").disabled = true;
    
    const previousScene = appState.currentScene;
    appState.currentScene = sceneIndex;
    const scene = scenes[sceneIndex];
    
    document.getElementById("scene-indicator").textContent = `Scene ${sceneIndex + 1} of ${scenes.length}`;
    
    if (previousScene !== sceneIndex && previousScene >= 0) {
        showSceneTransition(previousScene, sceneIndex);
    }
    
    // Interrupt any ongoing transitions and clear all elements
    g.selectAll("*").interrupt();
    g.selectAll("*").remove();
    
    // Use a small delay to ensure clean state before rendering
    setTimeout(() => {
        try {
            renderBeveragePopularityChart(scene);
            showSceneInsights(scene);
            
            // Apply entrance animation to new elements
            g.selectAll(".beverage-group, .legend, .annotation-group")
                .style("opacity", 0)
                .transition()
                .duration(600)
                .delay(200)
                .style("opacity", 1);
            
            // Reset the updating flag after all animations should be complete
            setTimeout(() => {
                appState.isUpdating = false;
                // Re-enable navigation buttons with proper state
                document.getElementById("prev-btn").disabled = appState.currentScene === 0;
                document.getElementById("next-btn").disabled = appState.currentScene === scenes.length - 1;
            }, 800); // 600ms animation + 200ms delay + buffer
            
        } catch (error) {
            console.error('Error updating scene:', error);
            appState.isUpdating = false;
            // Re-enable navigation buttons with proper state even on error
            document.getElementById("prev-btn").disabled = appState.currentScene === 0;
            document.getElementById("next-btn").disabled = appState.currentScene === scenes.length - 1;
        }
    }, 50);
}

function showSceneTransition(fromIndex, toIndex) {
    const fromScene = scenes[fromIndex];
    const toScene = scenes[toIndex];
    
    const transitionDiv = d3.select("body")
        .append("div")
        .style("position", "fixed")
        .style("top", "50%")
        .style("left", "50%")
        .style("transform", "translate(-50%, -50%)")
        .style("background", "rgba(44, 62, 80, 0.95)")
        .style("color", "#ecf0f1")
        .style("padding", "20px 30px")
        .style("border-radius", "10px")
        .style("font-size", "16px")
        .style("text-align", "center")
        .style("z-index", "1000")
        .style("opacity", 0)
        .style("box-shadow", "0 4px 20px rgba(0,0,0,0.5)");
    
    const direction = toIndex > fromIndex ? "forward" : "backward";
    const timeDirection = toIndex > fromIndex ? "later" : "earlier";
    const arrow = toIndex > fromIndex ? "→" : "←";
    
    transitionDiv.html(`
        <div style="margin-bottom: 10px; font-size: 14px; color: #f39c12;">
            <strong>Moving ${timeDirection} in time ${arrow}</strong>
        </div>
        <div style="margin-bottom: 5px;">
            <strong>From:</strong> ${fromScene.dateRange[0]}-${fromScene.dateRange[1]}
        </div>
        <div>
            <strong>To:</strong> ${toScene.dateRange[0]}-${toScene.dateRange[1]}
        </div>
    `);
    
    transitionDiv
        .transition()
        .duration(300)
        .style("opacity", 1)
        .transition()
        .delay(1000)
        .duration(300)
        .style("opacity", 0)
        .remove();
}

function renderBeveragePopularityChart(scene) {
    let beverageData;
    let startYear, endYear;
    
    if (appState.showAllScenes) {
        const allBeverageData = [];
        const allBeverageNames = new Set();
        
        Object.values(appState.topDishes).forEach(eraData => {
            eraData.forEach(beverage => allBeverageNames.add(beverage.dishName));
        });
        
        Array.from(allBeverageNames).forEach(beverageName => {
            const combinedYearlyData = [];
            
            for (let year = 1940; year <= 1990; year++) {
                const entry = appState.masterData.find(d => d.dishName === beverageName && d.year === year);
                combinedYearlyData.push({
                    year: year,
                    count: entry ? entry.count : 0,
                    avgPrice: entry ? entry.avgPrice : 0
                });
            }
            
            const totalCount = d3.sum(combinedYearlyData, d => d.count);
            if (totalCount > 0) {
                allBeverageData.push({
                    dishName: beverageName,
                    data: combinedYearlyData,
                    totalCount: totalCount,
                    avgPrice: d3.mean(combinedYearlyData.filter(d => d.avgPrice > 0), d => d.avgPrice) || 0
                });
            }
        });
        
        beverageData = allBeverageData
            .sort((a, b) => b.totalCount - a.totalCount)
            .slice(0, 15);
        
        startYear = 1940;
        endYear = 1990;
    } else {
        beverageData = appState.topDishes[scene.era];
        [startYear, endYear] = scene.dateRange;
    }
    
    const xScale = d3.scaleLinear()
        .domain([startYear, endYear])
        .range([0, width]);
    
    let maxValue, yAxisLabel;
    let yScale;
    if (appState.viewMode === 'popularity') {
        const allCounts = beverageData.flatMap(d => d.data.map(dd => dd.count));
        maxValue = d3.max(allCounts);
        yAxisLabel = "Popularity Index (Adjusted)";
        yScale = d3.scaleLinear();
    } else {
        const allPrices = beverageData.flatMap(d => d.data.map(dd => dd.avgPrice)).filter(p => p > 0);
        
        const cappedPrices = allPrices.filter(price => price <= 100);
        maxValue = d3.max(cappedPrices) || 0; 
        yAxisLabel = "Average Price (USD, super-sqrt scale, capped at $100)";
        yScale = d3.scalePow().exponent(0.25);
    }
    
    yScale.domain([0, maxValue * 1.1])
        .range([height, 0])
        .nice();
    
    addViewModeControls();
    
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    
    g.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => 
            appState.viewMode === 'price' ? `$${d.toFixed(2)}` : d.toFixed(0)
        ));
    
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(yAxisLabel);
    
    g.append("text")
        .attr("transform", `translate(${width / 2}, ${height + 50})`)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Year");
    
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#2c3e50")
        .text(scene.title);
    
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(appState.viewMode === 'popularity' ? d.count : Math.min(d.avgPrice, 100))) 
        .curve(d3.curveMonotoneX);
    
    const beverageGroups = g.selectAll(".beverage-group")
        .data(beverageData)
        .enter()
        .append("g")
        .attr("class", "beverage-group")
        .style("opacity", d => {
            return appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.2;
        })
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            toggleBeverageHighlight(d.dishName);
        })
        .on("mouseover", function(event, d) {
            if (appState.highlightedDish === null) {
                d3.selectAll(".beverage-group").style("opacity", 0.2);
                d3.select(this).style("opacity", 1);
            }
        })
        .on("mouseout", function() {
            if (appState.highlightedDish === null) {
                d3.selectAll(".beverage-group").style("opacity", 1);
            }
        });
    
    beverageGroups.append("path")
        .datum(d => d.data)
        .attr("fill", "none")
        .attr("stroke", (d, i) => colors(i))
        .attr("stroke-width", (d, i) => appState.highlightedDish === beverageData[i].dishName ? 4 : 2)
        .attr("d", line)
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .style("opacity", 0.8);
    
    beverageGroups.selectAll(".dot")
        .data(d => d.data.map(dd => ({...dd, dishName: d.dishName})))
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(appState.viewMode === 'popularity' ? d.count : Math.min(d.avgPrice, 100))) 
        .attr("r", 4)
        .attr("fill", (d, i, nodes) => {
            const parentIndex = Array.from(nodes[0].parentNode.parentNode.children).indexOf(nodes[0].parentNode);
            return colors(parentIndex);
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .on("mouseover", function(event, d) {
            g.selectAll(".tooltip").remove();
            
            const tooltip = g.append("g")
                .attr("class", "tooltip")
                .attr("transform", `translate(${d3.select(this).attr("cx")}, ${d3.select(this).attr("cy")})`);
            
            const tooltipHeight = 40;
            
            const rect = tooltip.append("rect")
                .attr("x", -70)
                .attr("y", -50)
                .attr("width", 140)
                .attr("height", tooltipHeight)
                .attr("fill", "#2c3e50")
                .attr("stroke", "#ecf0f1")
                .attr("rx", 4);
            
            tooltip.append("text")
                .attr("text-anchor", "middle")
                .attr("y", -35)
                .attr("fill", "#ecf0f1")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .text(d.dishName.length > 18 ? d.dishName.substring(0, 18) + "..." : d.dishName);
            
            let valueText;
            if (appState.viewMode === 'popularity') {
                valueText = `${d.year}: ${d.count} appearances`;
            } else {
                valueText = `${d.year}: $${d.avgPrice.toFixed(2)}`;
            }
            
            tooltip.append("text")
                .attr("text-anchor", "middle")
                .attr("y", -20)
                .attr("fill", "#ecf0f1")
                .style("font-size", "10px")
                .text(valueText);
        })
        .on("mouseout", function() {
            g.selectAll(".tooltip").remove();
        })
        .transition()
        .duration(800)
        .delay((d, i) => Math.floor(i / (endYear - startYear + 1)) * 100 + 500)
        .style("opacity", 1);
    
    createLegend(beverageData);
    
    addExplorationPanel(beverageData);
}

function createLegend(beverageData) {
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 30}, 20)`);
    
    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#2c3e50")
        .text("Top Beverages");
    
    const legendItems = legend.selectAll(".legend-item")
        .data(beverageData.slice(0, 10)) 
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${25 + i * 22})`)
        .style("opacity", d => appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.3)
        .on("click", function(event, d) {
            toggleBeverageHighlight(d.dishName);
        })
        .on("mouseover", function(event, d) {
            if (appState.highlightedDish === null) {
                d3.selectAll(".beverage-group").style("opacity", 0.2);
                d3.selectAll(".beverage-group").filter(dd => dd.dishName === d.dishName).style("opacity", 1);
                
                d3.selectAll(".legend-item").style("opacity", 0.3);
                d3.select(this).style("opacity", 1);
            }
        })
        .on("mouseout", function() {
            if (appState.highlightedDish === null) {
                d3.selectAll(".beverage-group").style("opacity", 1);
                d3.selectAll(".legend-item").style("opacity", 1);
            } else {
                d3.selectAll(".beverage-group").style("opacity", d => d.dishName === appState.highlightedDish ? 1 : 0.2);
                d3.selectAll(".legend-item").style("opacity", d => d.dishName === appState.highlightedDish ? 1 : 0.3);
            }
        });
    
    legendItems.append("line")
        .attr("x1", 0)
        .attr("x2", 18)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", (d, i) => colors(i))
        .attr("stroke-width", 3);
    
    legendItems.append("text")
        .attr("x", 25)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "#2c3e50")
        .style("-webkit-user-select", "none")
        .style("-moz-user-select", "none")
        .style("user-select", "none")
        .text(d => d.dishName.length > 15 ? d.dishName.substring(0, 15) + "..." : d.dishName);
}

function addExplorationPanel(beverageData) {
    let explorationPanel = d3.select("#exploration-panel");
    if (explorationPanel.empty()) {
        explorationPanel = d3.select("body")
            .append("div")
            .attr("id", "exploration-panel")
            .style("position", "fixed")
            .style("bottom", "20px")
            .style("left", "20px")
            .style("width", "320px")
            .style("background", "#34495e")
            .style("color", "#ecf0f1")
            .style("border-radius", "8px")
            .style("padding", "15px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
            .style("z-index", "100");
    }
    
    explorationPanel.html(`
        <h4 style="margin-top: 0; color: #e74c3c; border-bottom: 1px solid #7f8c8d; padding-bottom: 8px;">
            Deep Exploration Tools
        </h4>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 12px; margin-bottom: 5px; color: #bdc3c7;">
                Filter beverages by name:
            </label>
            <input type="text" id="beverage-filter" placeholder="ex. coffee" 
                   style="width: 100%; padding: 5px; border: none; border-radius: 4px; background: #2c3e50; color: #ecf0f1; font-size: 12px;"
                   value="${appState.filterKeyword}">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; font-size: 12px; cursor: pointer;">
                <input type="checkbox" id="show-all-scenes" ${appState.showAllScenes ? 'checked' : ''}
                       style="margin-right: 8px;">
                <span>Show data from all periods</span>
            </label>
            <div style="font-size: 10px; color: #bdc3c7; font-style: italic; margin-top: 2px;">
                View beverage trends across the entire timeline
            </div>
        </div>
    `);
    
    d3.select("#beverage-filter").on("input", function() {
        appState.filterKeyword = this.value;
        applyBeverageFilter();
    });
    
    d3.select("#show-all-scenes").on("change", function() {
        if (appState.isUpdating) {
            this.checked = !this.checked; // Revert checkbox state
            return;
        }
        appState.showAllScenes = this.checked;
        appState.highlightedDish = null;
        updateScene(appState.currentScene);
    });
}

function applyBeverageFilter() {
    const keyword = appState.filterKeyword.toLowerCase();
    if (keyword === '') {
        d3.selectAll(".beverage-group").style("display", "block");
        d3.selectAll(".legend-item").style("display", "block");
    } else {
        d3.selectAll(".beverage-group").style("display", function(d) {
            return d.dishName.toLowerCase().includes(keyword) ? "block" : "none";
        });
        d3.selectAll(".legend-item").style("display", function(d) {
            return d.dishName.toLowerCase().includes(keyword) ? "block" : "none";
        });
    }
}

function showSceneInsights(scene) {
    const beverageData = appState.topDishes[scene.era];
    const topBeverage = beverageData[0];
    
    let insightsPanel = d3.select("#insights-panel");
    if (insightsPanel.empty()) {
        insightsPanel = d3.select("body")
            .append("div")
            .attr("id", "insights-panel")
            .style("position", "fixed")
            .style("top", "20px")
            .style("right", "20px")
            .style("width", "300px")
            .style("background", "#2c3e50")
            .style("color", "#ecf0f1")
            .style("border-radius", "8px")
            .style("padding", "20px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)");
    }
    
    const viewModeText = appState.viewMode === 'popularity' ? 'Most Popular' : 'Most Expensive';
    const mainValue = appState.viewMode === 'popularity' 
        ? `${topBeverage.totalCount} total appearances`
        : `$${topBeverage.avgPrice} average price`;
    
    insightsPanel.html(`
        <h3 style="margin-top: 0; color: #3498db;">${scene.title}</h3>
        <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 13px;"><strong>Main Idea:</strong> ${scene.description}</p>
        </div>
        <p><strong>${viewModeText}:</strong> ${topBeverage.dishName} (${mainValue})</p>
        
        <div style="margin: 15px 0; border: 1px solid #34495e; border-radius: 5px; padding: 10px;">
            <p style="font-size: 14px; margin-bottom: 10px; color: #f39c12;"><strong>How to Explore:</strong></p>
            <div style="font-size: 12px; line-height: 1.4;">
                <div style="margin-bottom: 8px;">
                    <span style="background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">CLICK</span>
                    <span style="margin-left: 8px;">Legend items or lines to highlight beverages</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="background: #9b59b6; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">HOVER</span>
                    <span style="margin-left: 8px;">Dots for prices/counts, lines for preview</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="background: #27ae60; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">SWITCH</span>
                    <span style="margin-left: 8px;">Between Popularity & Price views below</span>
                </div>
                <div>
                    <span style="background: #f39c12; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px;">NAVIGATE</span>
                    <span style="margin-left: 8px;">Use Previous/Next for different eras</span>
                </div>
            </div>
        </div>
        
        <div style="border-top: 1px solid #34495e; padding-top: 10px;">
            <p style="font-size: 11px; font-style: italic; opacity: 0.8; margin-bottom: 5px;">
                <strong>Current:</strong> ${appState.viewMode === 'popularity' ? 'Popularity trends' : 'Price trends'}
            </p>
            ${appState.highlightedDish ? 
                `<p style="font-size: 11px; color: #e74c3c; margin: 0;">
                    <strong>Highlighting:</strong> ${appState.highlightedDish} 
                    <span style="font-style: italic;">(click same item to clear)</span>
                </p>` : 
                `<p style="font-size: 11px; color: #27ae60; margin: 0;">
                    <strong>Tip:</strong> Click any beverage to focus on it
                </p>`
            }
        </div>
    `);
}

function analyzeTrends(beverageData) {
    let maxIncrease = 0;
    let maxDecrease = 0;
    let risingBeverage = "None identified";
    let decliningBeverage = "None identified";
    
    beverageData.forEach(beverage => {
        const firstHalf = beverage.data.slice(0, Math.ceil(beverage.data.length / 2));
        const secondHalf = beverage.data.slice(Math.floor(beverage.data.length / 2));
        
        const firstAvg = d3.mean(firstHalf, d => d.count) || 0;
        const secondAvg = d3.mean(secondHalf, d => d.count) || 0;
        const change = secondAvg - firstAvg;
        
        if (change > maxIncrease) {
            maxIncrease = change;
            risingBeverage = beverage.dishName;
        }
        
        if (change < maxDecrease) {
            maxDecrease = change;
            decliningBeverage = beverage.dishName;
        }
    });
    
    return {
        rising: risingBeverage,
        declining: decliningBeverage
    };
}

function toggleBeverageHighlight(beverageName) {
    if (appState.highlightedDish === beverageName) {
        appState.highlightedDish = null;
    } else {
        appState.highlightedDish = beverageName;
    }
    
    g.selectAll(".beverage-group")
        .transition().duration(200)
        .style("opacity", d => appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.2);
    
    g.selectAll(".beverage-group path")
        .transition().duration(200)
        .attr("stroke-width", (d, i, nodes) => {
            const parentData = d3.select(nodes[i].parentNode).datum();
            return appState.highlightedDish === parentData.dishName ? 4 : 2;
        });
    
    g.selectAll(".legend-item")
        .transition().duration(200)
        .style("opacity", d => appState.highlightedDish === null || appState.highlightedDish === d.dishName ? 1 : 0.3);

    showSceneInsights(scenes[appState.currentScene]);
}

function addViewModeControls() {
    g.selectAll(".view-mode-controls").remove();
    
    const viewModeControls = g.append("g")
        .attr("class", "view-mode-controls")
        .attr("transform", `translate(10, ${height + 40})`);

    viewModeControls.append("text")
        .attr("x", 75)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#f39c12")
        .text("VIEW MODE");

    const popularityGroup = viewModeControls.append("g")
        .attr("class", "view-mode-button")
        .style("cursor", "pointer")
        .on("click", function() {
            if (appState.isUpdating) return;
            appState.viewMode = "popularity";
            updateScene(appState.currentScene);
        })
        .on("mouseover", function() {
            d3.select(this).select("rect")
                .transition().duration(200)
                .attr("stroke-width", appState.viewMode === 'popularity' ? 2 : 3);
        })
        .on("mouseout", function() {
            d3.select(this).select("rect")
                .transition().duration(200)
                .attr("stroke-width", 1);
        });

    popularityGroup.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 80)
        .attr("height", 35)
        .attr("fill", appState.viewMode === 'popularity' ? "#3498db" : "#34495e")
        .attr("stroke", appState.viewMode === 'popularity' ? "#ecf0f1" : "#7f8c8d")
        .attr("stroke-width", appState.viewMode === 'popularity' ? 2 : 1)
        .attr("rx", 6);

    popularityGroup.append("text")
        .attr("x", 40)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#ecf0f1")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .text("Popularity");
        
    popularityGroup.append("text")
        .attr("x", 40)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .attr("fill", "#bdc3c7")
        .style("font-size", "9px")
        .text("(appearances)");

    const priceGroup = viewModeControls.append("g")
        .attr("class", "view-mode-button")
        .attr("transform", "translate(90, 0)")
        .style("cursor", "pointer")
        .on("click", function() {
            if (appState.isUpdating) return;
            appState.viewMode = "price";
            updateScene(appState.currentScene);
        })
        .on("mouseover", function() {
            d3.select(this).select("rect")
                .transition().duration(200)
                .attr("stroke-width", appState.viewMode === 'price' ? 2 : 3);
        })
        .on("mouseout", function() {
            d3.select(this).select("rect")
                .transition().duration(200)
                .attr("stroke-width", 1);
        });

    priceGroup.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 70)
        .attr("height", 35)
        .attr("fill", appState.viewMode === 'price' ? "#3498db" : "#34495e")
        .attr("stroke", appState.viewMode === 'price' ? "#ecf0f1" : "#7f8c8d")
        .attr("stroke-width", appState.viewMode === 'price' ? 2 : 1)
        .attr("rx", 6);

    priceGroup.append("text")
        .attr("x", 35)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#ecf0f1")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .text("Price");
        
    priceGroup.append("text")
        .attr("x", 35)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .attr("fill", "#bdc3c7")
        .style("font-size", "9px")
        .text("(USD)");
}

document.getElementById("next-btn").addEventListener("click", function() {
    if (appState.isUpdating) {
        console.log('Scene update in progress, please wait...');
        return;
    }
    if (appState.currentScene < scenes.length - 1) {
        updateScene(appState.currentScene + 1);
    }
});

document.getElementById("prev-btn").addEventListener("click", function() {
    if (appState.isUpdating) {
        console.log('Scene update in progress, please wait...');
        return;
    }
    if (appState.currentScene > 0) {
        updateScene(appState.currentScene - 1);
    }
});