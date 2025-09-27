import React, { useEffect } from 'react';
export const TestApp: React.FC = () => {
  useEffect(() => {
    console.log('TestApp component mounted');
    return () => {
      console.log('TestApp component unmounted');
    };
  }, []);
  console.log('TestApp rendering...');
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1>FlowCanvas Test</h1>
      <p>If you can see this, React is working!</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
      <div style={{
        width: '200px',
        height: '100px',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        marginTop: '20px'
      }}>
        Test Card
      </div>
    </div>
  );
};