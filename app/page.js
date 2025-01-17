// app/page.js

import Head from 'next/head';
import Prediction from './components/Prediction';

const Home = () => {
  return (
    <div>
      <Head>
        <title>Teachable Machine Prediction</title>
        <meta name="description" content="Teachable Machine model prediction with webcam" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ textAlign: 'center' }}>
        <h1>Welcome to the Teachable Machine Demo</h1>
        <Prediction />
      </main>

      <footer style={{ textAlign: 'center', padding: '20px' }}>
        <p>&copy; 2025 Your Company</p>
      </footer>
    </div>
  );
};

export default Home;
