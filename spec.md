# TolMaster - Product Specification

## 1. Product Overview
**TolMaster** is a professional-grade 1D Tolerance Analysis and Stack-up simulation tool designed for mechanical engineers. It enables users to perform complex tolerance stack-up calculations using Monte Carlo methodology to predict assembly build rates, yield, and process capability (Cpk/Ppk).

The application is built as a cross-platform solution, capable of running as a web application or a standalone desktop application (via Electron), with support for single-file HTML portability.

## 2. Key Features

### 2.1 Tolerance Stack-up Analysis
- **Monte Carlo Simulation**: High-speed simulation engine supporting up to 5,000,000 iterations per run.
- **Dynamic Stack Model**: 
  - Drag-and-drop interface for reordering dimensions.
  - toggleable contribution direction (+/-).
  - Support for multiple Analysis Sheets (Projects).
- **Compression Mode**: Specialized mode for analyzing compression ratios in assemblies.

### 2.2 Statistical Distributions
Supported distributions for individual tolerance items:
- **Normal**: Standard Gaussian distribution.
- **Normal (Sort)**: Sorted normal distribution simulation.
- **Uniform**: Rectangular distribution.
- **Fixed**: Constant value.
- **Empirical**: Bootstrap resampling from imported real-world measurement data.

### 2.3 Advanced Modeling
- **Fit Shift Calculator**: 
  - Simulates the "floating" behavior of fasteners/pins in clearance holes.
  - Supports both **Uniform** and **Beta(0.5, 0.5)** distributions for shift calculation.
  - Handles symmetric (±) and asymmetric tolerance inputs for Hole/Shaft diameters.
- **Dynamic Mean Drift**: Option to simulate long-term process variation with a ±1.5σ mean drift.

### 2.4 Statistical Process Control (SPC) Integration (**SPC Modal**)
- **Data Import**: Paste raw measurement data directly.
- **Analysis**:
  - Automatic calculation of Mean, Sigma, CP, CPK, PP, PPK.
  - **Normality Test**: Anderson-Darling test (A² statistic) to validate data distribution.
  - **Visualizations**: Histograms with normal curve overlays, Box Plots, Run Charts, and QQ Plots.
- **Integration**: Apply calculated statistics directly to stack-up dimensions (Empirical or parametric).

### 2.5 Dual-Pair Analysis (**DualPairAnalysisModal**)
- Specialized module for analyzing "Shared Clearance" scenarios (e.g., two pins mating with two holes).
- Visualizes 2D clearance zones and overlap probabilities.
- Calculates interference risks and virtual condition boundaries.

## 3. User Interface
- **Interactive Dashboard**: Real-time stack-up table with immediate feedback.
- **Visual Reporting**: 
  - Interactive Histograms for simulation results.
  - Contribution charts (Sensitivity Analysis) to identify critical dimensions.
  - Screen capture/export functionality for reporting.
- **Responsive Design**: Modern UI built with Tailwind CSS v4 and Lucide icons.

## 4. Technical Specifications

### 4.1 Technology Stack
- **Frontend Framework**: React 19, Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React Hooks (Context/Local State)
- **Visualization**: Recharts
- **Drag & Drop**: @dnd-kit

### 4.2 Build & Deployment
- **Web App**: Built via Next.js.
- **Desktop App**: Electron wrapper for local installation.
- **Portable Mode**: Capability to bundle the entire app into a **Single HTML File** (via Vite) for easy sharing without server infrastructure.

### 4.3 Data Persistence
- **Local Storage**: Automatically saves user projects and settings to the browser's local storage.
- **Project IO**: JSON-based import/export of project data.

## 5. Performance Goals
- **Simulation Speed**: Execute 1,000,000 loop simulations in under 2 seconds on standard hardware.
- **Accuracy**: Numerical precision handling to avoid floating-point errors (e.g., -0 display).
- **Scalability**: Handle 50+ dimensions per stack without UI lag.

## 6. Future Roadmap (Potential)
- 3D Vector Loop Analysis.
- Cloud storage integration.
- Direct CAD import plugin.
