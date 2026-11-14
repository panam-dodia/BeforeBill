import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';

// App root. Only one screen for now; navigation gets added when a second screen is needed.
export default function App() {
  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}
