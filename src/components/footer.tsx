export const Footer = () => {
  return (
    <footer className="mx-auto max-w-screen-2xl py-8 px-8 md:px-24 h-24 flex flex-col items-center justify-center dark:text-white">
      <a
        href="https://internetcomputer.org/docs/current/developer-docs/integrations/https-outcalls/"
        className="text-center text-sm hover:text-lavender-blue-500 active:text-lavender-blue-400 mb-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more about HTTPS Outcalls on ICP
      </a>
      <a
        href="https://juno.build"
        className="text-center text-sm hover:text-lavender-blue-500 active:text-lavender-blue-400"
        target="_blank"
        rel="noopener noreferrer"
      >
        Built with Juno
      </a>
    </footer>
  );
};
