import 'react-native-gesture-handler';
import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App'; // Main App with DrawerNavigator
import { name as appName } from '../app.json';

// Register the main App component (the one with DrawerNavigator and Sidebar)
AppRegistry.registerComponent(appName, () => App);
