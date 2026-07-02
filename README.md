# UK Energy Dashboard

An interactive data visualization dashboard that explores UK energy consumption patterns across sectors from 1990 to 2023. Built with D3.js, this dashboard enables users to analyze energy trends, compare consumption strategies, and understand renewable energy contributions.

## 🎯 Project Overview

The UK Energy Dashboard provides a comprehensive view of energy data through coordinated, multi-faceted visualizations. Users can explore historical energy evolution, sector-level rankings, efficiency comparisons, and renewable energy sources—all synchronized through an intuitive control interface.

### Key Features

- **Historical Demand Evolution**: Track energy usage patterns over 30+ years with gradient area charts
- **Resource Efficiency Ranking**: Compare sectors by consumption volume with horizontal progress bars
- **Efficiency Gap Analysis**: Visualize direct consumption vs. reallocated use across time
- **Energy Intensity Heatmap**: Explore all sectors across all years in a color-coded matrix
- **Renewable Energy Composition**: Stacked area chart showing renewable source contributions
- **Source Mix Breakdown**: Interactive donut chart for selected year's renewable sources
- **Interactive Controls**: Toggle between data strategies, filter by sector, adjust year range via slider
- **Cross-chart Synchronization**: Hover and click interactions coordinate all visualizations

## 📊 Tech Stack

- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **Visualization Library**: [D3.js v7](https://d3js.org/) - For interactive data-driven visualizations
- **Markup**: HTML5 with semantic structure
- **Styling**: CSS3 with CSS custom properties (variables), flexbox, CSS Grid
- **Fonts**: Google Fonts (Outfit family)
- **Data Format**: CSV
- **Responsive Design**: Mobile-first approach with breakpoints at 1200px, 820px, 520px

### Language Composition
- **JavaScript**: 71.3%
- **CSS**: 17.5%
- **HTML**: 11.2%

## 📁 Project Structure

```
EnergyDaash/
├── index.html                    # Main HTML entry point
├── app.js                        # Core D3 visualization & state management
├── style.css                     # Responsive styling & theme variables
├── DirectConsumption.csv         # Energy consumption by sector (1990-2023)
├── ReallocatedUse.csv           # Reallocated energy use by sector
├── RenewableSources.csv         # Renewable and waste energy sources
└── .vscode/                      # VS Code configuration
```

## 🗂️ Data Sources

The dashboard ingests three CSV datasets:

### 1. **DirectConsumption.csv**
- Energy directly consumed by industry sectors
- Columns: `Industry` (year), sector names (Total, Manufacturing, Construction, etc.)
- Time Range: 1990–2023
- Unit: Million tonnes of oil equivalent (Mtoe)

### 2. **ReallocatedUse.csv**
- Energy reallocated to industrial use after conversion
- Columns: `Industry` (year), sector names
- Time Range: 1990–2023
- Unit: Mtoe
- Used to compare efficiency of energy distribution strategies

### 3. **RenewableSources.csv**
- Breakdown of renewable and waste energy sources
- Columns: `Source` (year), fuel sources (Solar, Wind, Hydro, Biomass, etc.)
- Time Range: 1990–2023
- Unit: Mtoe

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools or dependencies to install

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/tarunmanoharann/EnergyDaash.git
   cd EnergyDaash
   ```

2. **Serve locally** (required due to CORS restrictions on CSV loading)
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Node.js (http-server)
   npx http-server
   
   # Or using Ruby
   ruby -run -ehttpd . -p8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 🎮 How to Use

### Navigation Controls

**Data Strategy Toggle**
- Switch between "Direct Consumption" and "Reallocated Use" datasets
- Charts update dynamically with color changes (blue for direct, red for reallocated)

**Column Name (Sector) Picker**
- Dropdown to select specific sectors or "Total"
- Trend charts and efficiency comparisons update in real-time

**Year Range Slider**
- Drag to select years from 1990 to 2023
- All charts focus on the selected year
- Used by ranking, composition, and heatmap charts

### Interactive Features

- **Hover**: Display tooltips with detailed values
- **Click on Data Points**: Set dashboard focus (sector/year)
- **Hover on Heatmap**: Syncs all charts to the hovered sector and year
- **Click on Chart Areas**: Select specific years from trend and composition charts
- **Responsive Resize**: Charts adapt automatically to window resizing

## 📊 Visualization Details

### Trend Analysis (Area Gradient)
- Shows historical consumption for selected sector
- Gradient-filled area with line overlay
- Interactive points for year selection
- Supports both direct and reallocated data

### Ranking Analysis (Horizontal Bars)
- Top sectors by consumption for selected year
- Color intensity reflects sector focus
- Sortable by clicking sector names

### Efficiency Gap (Comparative Line Chart)
- Overlays direct vs. reallocated use
- Dual-line comparison with legend
- Year-based point selection

### Energy Intensity Heatmap
- All sectors (rows) × all years (columns)
- Color intensity represents consumption magnitude
- Hover-to-sync master control behavior
- Separate color scales for direct (blue) and reallocated (red)

### Source Composition (Stacked Area)
- Temporal distribution of renewable energy sources
- Interactive hover for year synchronization
- Click-to-focus year selection

### Source Mix Breakdown (Donut Chart)
- Top 7 renewable sources for selected year
- Central value display
- Percentage labels and legend

## ⚙️ Configuration

Edit `app.js` to customize:

```javascript
const CONFIG = {
    margin: { top: 30, right: 30, bottom: 50, left: 60 },  // Chart margins
    colors: { ... },  // Color palette (blues, greens, purples, etc.)
    duration: 1000    // Animation transition duration (ms)
};
```

CSS theme variables in `style.css`:
```css
:root {
    --accent-primary: #2563eb;    /* Primary interaction color */
    --main-bg: #f6f8fb;           /* Background color */
    --card-bg: #ffffff;           /* Card background */
    /* ... more customization options */
}
```

## 🔄 Data Processing Pipeline

1. **Load**: D3 reads all three CSV files via `Promise.all()`
2. **Parse**: Data rows filtered and validated
3. **Extract**: Column headers become sector/source names
4. **State**: Shared state object maintains dashboard context
5. **Render**: Charts initialize with default values
6. **Update**: Synchronized updates on user interaction

## 📱 Responsive Design

The dashboard adapts to screen sizes:
- **Desktop (>1200px)**: 2-column chart grid, full navbar
- **Tablet (820px–1200px)**: Single-column cards, stacked controls
- **Mobile (<820px)**: Optimized touch targets, full-width charts
- **Small Mobile (<520px)**: Extended heatmap height for readability

## 🌐 Browser Support

- Chrome/Chromium (v90+)
- Firefox (v88+)
- Safari (v14+)
- Edge (v90+)

## 📝 License

This project is open source. Check repository for license details.

## 🤝 Contributing

Contributions are welcome! To contribute:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## 📖 Data Insights & Use Cases

- **Policy Analysis**: Track energy policy impact across sectors
- **Sustainability Planning**: Monitor renewable energy growth
- **Industrial Efficiency**: Compare sector consumption trends
- **Academic Research**: Historical energy use patterns
- **Business Intelligence**: Identify emerging energy trends

## 🛠️ Troubleshooting

**CSV files not loading?**
- Ensure you're running a local server (not opening `index.html` directly)
- Check browser console for CORS errors

**Charts not rendering?**
- Verify D3.js CDN is accessible
- Clear browser cache and reload

**Year slider not updating charts?**
- Ensure JavaScript is enabled
- Check browser console for errors

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for similar problems
- Review browser console for error messages

---

**Created by**: Tarun Manohar  
**Last Updated**: 2026  
**Repository**: [tarunmanoharann/EnergyDaash](https://github.com/tarunmanoharann/EnergyDaash)
