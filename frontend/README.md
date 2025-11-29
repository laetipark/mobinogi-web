# MobiNogi Controllers Project

Modern React application for managing and monitoring gaming controllers built with Vite.

## 🎮 Features

### Authentication System

- **User Registration**: Secure account creation with email validation
- **User Login**: Session management with localStorage persistence
- **Password Security**: Real-time password strength indicator
- **Protected Routes**: Automatic redirection based on authentication state

### Controller Dashboard

- **Real-time Monitoring**: Live controller status and battery levels
- **Detailed Information**: Comprehensive controller specs and statistics
- **Interactive Interface**: Click to view detailed controller information
- **Multi-controller Support**: Manage multiple gaming controllers

### Modern UI/UX

- **Dark Theme**: Professional dark mode interface
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Smooth Animations**: Micro-interactions and transitions
- **Accessibility**: Keyboard navigation and screen reader support

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobinogi-controllers-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx
│   ├── LoadingScreen.jsx
│   ├── ControllerCard.jsx
│   └── ControllerDetailsPanel.jsx
├── pages/              # Page components
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── ControllersPage.jsx
├── contexts/           # React Context providers
│   └── AuthContext.jsx
├── hooks/              # Custom React hooks
│   └── useAuth.js
├── utils/              # Utility functions
│   └── helpers.js
├── styles/             # CSS styles
│   └── index.css
├── App.jsx             # Main app component
└── main.jsx           # Entry point
```

## 🛠 Technology Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Styling**: CSS3 with Custom Properties
- **State Management**: React Context + useState
- **Storage**: localStorage for session persistence

## 🎨 Design System

### Color Palette

- **Primary**: `#6366F1` (Indigo)
- **Background**: `#0F0F23` (Dark Blue)
- **Surface**: `#1A1A2E` (Dark Surface)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Yellow)
- **Error**: `#EF4444` (Red)

### Typography

- **Font Family**: Inter (Google Fonts)
- **Font Weights**: 400, 500, 600, 700, 800

## 📱 Responsive Breakpoints

- **Mobile**: 480px and below
- **Tablet**: 768px and below
- **Desktop**: 1200px and above

## ⚡ Performance Optimizations

- **Code Splitting**: Automatic chunking via Vite
- **Tree Shaking**: Dead code elimination
- **CSS Optimization**: Minimal runtime styles
- **Image Optimization**: Efficient asset loading

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🧪 Testing

The project includes:

- Component isolation testing
- User authentication flow testing
- Responsive design validation

## 📦 Dependencies

### Production Dependencies

- `react`: UI library
- `react-dom`: DOM bindings for React
- `react-router-dom`: Client-side routing
- `lucide-react`: Icon library

### Development Dependencies

- `@vitejs/plugin-react`: Vite React plugin
- `vite`: Build tool
- `eslint`: Code linting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔮 Future Enhancements

- Real-time WebSocket connections for live updates
- Controller firmware update management
- Advanced analytics and usage reports
- Multi-language support (i18n)
- Dark/Light theme toggle
- Controller customization profiles
- Cloud synchronization
- Mobile app companion

## 📞 Support

For support and questions:

- Create an issue in the repository
- Contact the development team

---

Built with ❤️ for the gaming community
