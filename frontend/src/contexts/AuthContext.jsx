import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi, logout as logoutApi, getMe } from '../api/auth'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          const res = await getMe()
          setUser(res.data.user || res.data)
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
          setToken(null)
        }
      }
      setInitializing(false)
    }
    verify()
  }, [])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    try {
      const res = await loginApi(credentials)
      if (!res.data || typeof res.data !== 'object' || !res.data.token) {
        return {
          success: false,
          message: 'Unable to connect to backend service. Please check your backend URL.'
        }
      }
      const { token: newToken, user: newUser } = res.data
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(newUser))
      setToken(newToken)
      setUser(newUser)
      return { success: true }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Login failed. Please check backend connection.'
      return { success: false, message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole])
  const isFacilityManager = useCallback(() => hasRole('admin', 'facility_manager'), [hasRole])
  const isTechnician = useCallback(() => hasRole('technician'), [hasRole])
  const isConsumer = useCallback(() => hasRole('consumer'), [hasRole])

  const value = {
    user,
    token,
    loading,
    initializing,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasRole,
    isAdmin,
    isFacilityManager,
    isTechnician,
    isConsumer,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
