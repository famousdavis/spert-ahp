interface AppFooterProps {
  onNavigate?: (page: string) => void;
}

export default function AppFooter({ onNavigate }: AppFooterProps) {
  return (
    <footer className="border-t-2 border-gray-100 dark:border-gray-700 pb-6 pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <div>
        &copy; {new Date().getFullYear()} William W. Davis, MSPM, PMP |{" "}
        <button
          onClick={() => onNavigate?.('Changelog')}
          className="text-blue-600 hover:text-blue-700"
        >
          Version 0.13.0
        </button>
        {" "}| Licensed under GNU GPL v3
      </div>
      <div className="mt-1">
        <a
          href="https://spertsuite.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          SPERT&reg; Suite
        </a>
        {" | "}
        <a
          href="https://spertsuite.com/TOS.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          Terms of Service
        </a>
        {" | "}
        <a
          href="https://spertsuite.com/PRIVACY.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          Privacy Policy
        </a>
        {" | "}
        <a
          href="https://github.com/famousdavis/spert-ahp/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          License
        </a>
      </div>
    </footer>
  );
}
