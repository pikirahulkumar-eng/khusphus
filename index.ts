import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';
import CallApp from './src/components/CallApp';

// 1. Main Sunao Application
registerRootComponent(App);

// 2. Standalone CallApp for CallActivity (Lock Screen instant call pickup)
AppRegistry.registerComponent('CallApp', () => CallApp);

