import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getCurrentUser, login, register } from '../api';

const STORAGE_KEY = 'crimewatch_auth';

const readStoredAuth = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const writeStoredAuth = (payload) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const clearStoredAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      return await login(credentials);
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (payload, { rejectWithValue }) => {
    try {
      return await register(payload);
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Registration failed');
    }
  }
);

export const refreshCurrentUser = createAsyncThunk(
  'auth/refreshCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCurrentUser();
      return response.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Session expired');
    }
  }
);

const storedAuth = readStoredAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedAuth?.user || null,
    token: storedAuth?.token || null,
    status: 'idle',
    error: null
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      clearStoredAuth();
    },
    clearAuthError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        writeStoredAuth(action.payload);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        writeStoredAuth(action.payload);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(refreshCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        if (state.token) {
          writeStoredAuth({ user: action.payload, token: state.token });
        }
      })
      .addCase(refreshCurrentUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        clearStoredAuth();
      });
  }
});

export const { clearAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
