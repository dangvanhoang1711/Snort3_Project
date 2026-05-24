import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Snort IDS dashboard title', () => {
  render(<App />);
  expect(screen.getByText(/Snort IDS/i)).toBeInTheDocument();
});
