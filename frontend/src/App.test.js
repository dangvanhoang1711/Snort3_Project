import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SNORT dashboard title', () => {
  render(<App />);
  expect(screen.getByText(/^SNORT$/i)).toBeInTheDocument();
});
