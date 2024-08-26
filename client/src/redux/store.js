// root/client/src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './reducers'; // Import your user reducer

const store = configureStore({
  reducer: {
    user: userReducer, // Set up the user reducer
  },
});

export default store;