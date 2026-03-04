# ApexERP Frontend

A modern React-based frontend for the ApexERP system with support for multiple languages, dark mode, and responsive design.

## Technologies

- **React 18** - Component-based UI framework
- **React Router v6** - Client-side routing
- **TypeScript** - Type safety (optional)
- **Tailwind CSS** - Utility-first CSS styling
- **Axios** - HTTP client
- **React Context API** - State management
- **react-i18next** - Internationalization (i18n)
- **React Hot Toast** - Toast notifications
- **Recharts** - Data visualization

## Project Structure

```
src/
├── pages/                    # Page components
│   ├── LoginPage.jsx
│   ├── Dashboard.jsx
│   ├── FinancePage.jsx
│   ├── HRPage.jsx
│   ├── CRMPage.jsx
│   ├── InventoryPage.jsx
│   ├── SalesPage.jsx
│   ├── ProjectsPage.jsx
│   ├── ManufacturingPage.jsx
│   ├── MarketingPage.jsx
│   ├── AnalyticsPage.jsx
│   ├── EcommercePage.jsx
│   └── SettingsPage.jsx
│
├── components/               # Reusable components
│   ├── common/              # Common UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── DataTable.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Modal.jsx
│   │   └── Sidebar.jsx
│   ├── layout/              # Layout components
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── MainLayout.jsx
│   └── forms/               # Form components
│       └── FormField.jsx
│
├── contexts/                 # React Context
│   ├── AuthContext.jsx       # Authentication state
│   └── ThemeContext.jsx      # Theme & language state
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.js
│   ├── useTheme.js
│   └── useFetch.js
│
├── api/                      # API integration
│   ├── client.js             # Axios instance
│   └── endpoints.js          # API endpoint definitions
│
├── utils/                    # Utility functions
│   ├── formatters.js         # Data formatters
│   ├── validators.js         # Form validators
│   └── helpers.js            # Helper functions
│
├── i18n/                     # Internationalization
│   ├── en/
│   │   └── translation.json  # English translations
│   ├── ar/
│   │   └── translation.json  # Arabic translations
│   └── config.js             # i18n configuration
│
├── styles/                   # Global styles
│   ├── tailwind.css
│   ├── globals.css
│   └── variables.css
│
├── App.jsx                   # Main app component
├── index.jsx                 # Entry point
└── package.json
```

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm start
```

The application will open at http://localhost:3000

### Build for Production

```bash
npm run build
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Pages Overview

### Login Page
- Email/password authentication
- Theme toggle
- Demo credentials display
- Responsive design with dark mode support

### Dashboard
- Executive KPI cards
- Revenue tracking
- Order metrics
- Employee count
- Sales pipeline value
- Charts and visualizations

### Finance
- Invoice management
- Revenue summary
- Outstanding invoices
- Overdue tracking

### HR
- Employee list
- Department information
- Position tracking
- Hire dates

### CRM
- Contact management
- Lead scoring
- Company associations
- Contact type classification

### Inventory
- Product catalog
- SKU management
- Stock levels
- Category organization

### Sales
- Order management
- Customer information
- Order status tracking
- Revenue metrics

### Projects
- Project listing
- Progress tracking
- Priority management
- Manager assignments

### Settings
- User profile
- Theme selection
- Language preference
- Account management

## Component Usage

### Button Component
```jsx
<Button onClick={handleClick} loading={isLoading} variant="primary">
  Click Me
</Button>
```

### Card Component
```jsx
<Card title="Revenue">
  <p>Revenue content here</p>
</Card>
```

### DataTable Component
```jsx
<DataTable 
  columns={columns} 
  data={data} 
  loading={loading}
  onRowClick={handleRowClick}
/>
```

## Authentication

The frontend uses JWT-based authentication:

1. User logs in with email/password
2. Backend returns access and refresh tokens
3. Access token is stored in localStorage
4. Token is sent in Authorization header for API requests
5. Expired tokens are automatically refreshed

### AuthContext Usage

```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user.first_name}!</p>}
    </div>
  );
}
```

## Internationalization

The app supports English and Arabic with automatic RTL support for Arabic.

### Switching Language

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };
  
  return <h1>{t('common.welcome')}</h1>;
}
```

### Adding Translations

Edit `src/i18n/en/translation.json` or `src/i18n/ar/translation.json`:

```json
{
  "common": {
    "welcome": "Welcome",
    "name": "Name"
  },
  "dashboard": {
    "revenue": "Revenue",
    "orders": "Orders"
  }
}
```

## Dark Mode

Theme switching is managed by ThemeContext:

```jsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Switch to {theme === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
}
```

## API Integration

Axios client is configured at `src/api/client.js`:

```javascript
import api from '../api/client';

// GET request
const { data } = await api.get('/finance/invoices/');

// POST request
const response = await api.post('/finance/invoices/', {
  invoice_number: 'INV-001',
  customer_name: 'ACME Corp',
  total: 1000
});

// PUT request
await api.put(`/finance/invoices/${id}/`, updatedData);

// DELETE request
await api.delete(`/finance/invoices/${id}/`);
```

## Styling with Tailwind CSS

The project uses Tailwind CSS for all styling. Key utilities:

```jsx
// Colors
className="text-primary-600 bg-gray-50 dark:bg-gray-800"

// Spacing
className="px-4 py-2 m-4"

// Flexbox
className="flex items-center justify-between gap-4"

// Responsive
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"

// Dark mode
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
```

## Form Handling

Example form submission:

```jsx
import { useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

function MyForm() {
  const [formData, setFormData] = useState({ name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/endpoint/', formData);
      toast.success('Success!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

## Performance Tips

1. Use React.memo for expensive components
2. Implement pagination for large lists
3. Use lazy loading for images
4. Code split routes with React.lazy
5. Cache API responses appropriately
6. Minimize bundle size

## Environment Variables

Create `.env` file:

```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_VERSION=1.0.0
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test LoginPage.test.jsx
```

## Deployment

### Docker
```bash
docker build -f Dockerfile -t apexerp-frontend .
docker run -p 3000:3000 apexerp-frontend
```

### Static Build
```bash
npm run build
# Serve 'build' folder with static server
npx serve -s build
```

## Troubleshooting

### Port 3000 already in use
```bash
PORT=3001 npm start
```

### CORS errors
Check backend CORS configuration in `settings.py`

### API not responding
Verify backend is running at the configured API_BASE_URL

### Module not found errors
```bash
rm -rf node_modules package-lock.json
npm install
```

## Best Practices

1. Keep components small and focused
2. Use meaningful variable names
3. Add prop validation with PropTypes or TypeScript
4. Handle errors gracefully
5. Show loading states
6. Implement proper pagination
7. Use React hooks instead of class components
8. Keep state close to where it's used

## Contributing

Follow these guidelines when contributing:

1. Follow the existing code style
2. Write meaningful commit messages
3. Test your changes
4. Update documentation
5. Create feature branches

## Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Axios Documentation](https://axios-http.com)
- [i18next Guide](https://www.i18next.com)

## License

MIT License - see LICENSE file for details
