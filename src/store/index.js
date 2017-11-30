import Vue from 'vue'
import Vuex, { mapActions } from 'vuex'
import * as firebase from 'firebase'

Vue.use(Vuex)

export const store = new Vuex.Store({
  state: {
    loadedProducts: [
    //   { 
    //     imageUrl: 'https://images.duckduckgo.com/iu/?u=http%3A%2F%2F3.bp.blogspot.com%2F-FaOGwNsXfOk%2FUYAGYZCvsLI%2FAAAAAAAAEsc%2F8obdFZhlXtc%2Fs1600%2FMId_Century_Modern_Sofa_2.JPG&f=1', 
    //     id: 'qlwejfkqeasflkja', 
    //     title: 'Mid-Century Couch',
    //     date: new Date() 
    //   },
    //   {
    //     imageUrl: 'http://2.bp.blogspot.com/-3xtWYg6SzDk/Tge3tFO216I/AAAAAAAAB1M/S5FyyjETl_M/s1600/Brasillia_1.jpg', 
    //     id: 'alsdjflkasjasldj', 
    //     title: 'Mid-Century Credenza',
    //     date: new Date()
    //   },
    //   { 
    //     imageUrl: 'https://images.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn1.pamono.com%2Fp%2Fz%2F1%2F7%2F175353_3ococx4ea2%2Fmid-century-modern-coffee-table-from-pander-5.jpg&f=1', 
    //     id: 'asldkfjalkdfj',
    //     title: 'Mid-Century Table',
    //     date: new Date()
    // }
    ],
    user: null,
    loading: false,
    error: null
  },
  mutations: {
    favoriteProduct(state, payload) {
      const id = payload.id
      if (state.user.favoritedProducts.findIndex(product => product.id === id) >= 0) {
        return
      }
      state.user.favoritedProducts.push(id)
      state.user.fbKeys[id] = payload.fbKey
    },
    unfavoriteProduct(state, payload) {
      const favoritedProducts = state.user.favoritedProducts
      favoritedProducts.splice(favoritedProducts.findIndex(product => product.id === payload), 1)
      Reflect.deleteProperty(state.user.fbKeys, payload)
    },
    createProduct(state, payload) {
      state.loadedProducts.push(payload)
    },
    updateProduct(state, payload) {
      const product = state.loadedProducts.find(product => {
        return product.id === payload.id
      })
      if (payload.title) {
        product.title = payload.title
      }
      if (payload.description) {
        product.description = payload.description
      }
    },
    setUser(state, payload) {
      state.user = payload
    },
    setLoading(state, payload) {
      state.loading = payload
    },
    setError(state, payload) {
      state.error = payload
    },
    clearError(state) {
      state.error = null
    },
    setLoadedProducts(state, payload) {
      state.loadedProducts = payload
    }
  },
  actions: {
    favoriteProduct({commit, getters}, payload) {
      commit('setLoading', true)
      const user = getters.user
      firebase.database().ref('/users/' + user.id) 
        .child('/favorites/')
        .push(payload)
        .then(data => {
          commit('setLoading', false)
          commit('favoriteProduct', {id: payload, fbKey: data.key})
        })
        .catch(error => {
          commit('setLoading', false)
          console.log(error)
        })
    },
    unfavoriteProduct({commit, getters}, payload) {
      commit('setLoading', true)
      const user = getters.user
      if (!user.fbKeys) {
        return
      }
      const fbKey = user.fbKeys[payload]
      firebase.database().ref('/users/' + user.id + '/favorites/').child(fbKey)
        .remove()
        .then(() => {
          commit('unfavoriteProduct', payload)
          commit('setLoading', false)
        })
        .catch(error => {
          commit('setLoading', false)
          console.log(error)
        })
    },
    loadProducts({commit}) {
      commit('setLoading', true)
      firebase.database().ref('products').once('value')
        .then(data => {
          const products = []
          const obj = data.val()
          for (let key in obj) {
            products.push({
              id: key,
              title: obj[key].title,
              categories: obj[key].categories,
              imageUrl: obj[key].imageUrl,
              description: obj[key].description,
              links: obj[key].links,
              date: obj[key].date,
              creatorId: obj[key].creatorId
            })
          }
          commit('setLoadedProducts', products)
          commit('setLoading', false)
        })
        .catch(error => {
          commit('setLoading', false)
          console.log(error)
        })
    },
    createProduct({commit, getters}, payload) {
      const product = {
        title: payload.title,
        categories: payload.categories,
        imageUrl: payload.imageUrl,
        description: payload.description,
        links: payload.links,
        date: payload.date.toISOString(),
        creatorId: getters.user.id
      }
      firebase.database().ref('products').push(product)
        .then(data => {
          const key = data.key
          commit('createProduct', {...product, id: key})
        })
        .catch(error => {
          console.log(error)
        })
    },
    updateProductData({commit}, payload) {
      commit('setLoading', true)
      const updateObj = {}
      if (payload.title) {
        updateObj.title = payload.title
      }
      if (payload.description) {
        updateObj.description = payload.description
      }
      firebase.database().ref('products').child(payload.id).update(updateObj)
        .then(() => {
          commit('setLoading', false)
          commit('updateProduct', payload)
        })
        .catch(error => {
          commit('setLoading', false)
          console.log(error)
        })
    },
    signUserUp({commit}, payload) {
      commit('setLoading', true)
      commit('clearError')
      firebase.auth().createUserWithEmailAndPassword(payload.email, payload.password)
        .then(
          user => {
            commit('setLoading', false)
            const newUser = {
              id: user.uid,
              favoritedProducts: [],
              fbKeys: {}
            }
            commit('setUser', newUser)
          }
        )
        .catch(error => {
          commit('setLoading', false)
          commit('setError', error)
          console.log(error)
        })
    },
    signUserIn({commit}, payload) {
      commit('setLoading', true)
      commit('clearError')
      firebase.auth().signInWithEmailAndPassword(payload.email, payload.password)
        .then(
          user => {
            commit('setLoading', false)
            const newUser = {
              id: user.uid,
              favoritedProducts: [],
              fbKeys: {}
            }
            commit('setUser', newUser)
          }
        )
        .catch(error => {
          commit('setLoading', false)
          commit('setError', error)
          console.log(error)
        })
    },
    autoSignIn({commit}, payload) {
      commit('setUser', {
        id: payload.uid, 
        favoritedProducts: [],
        fbKeys: {}
      })
    },
    fetchUserData({commit, getters}) {
      commit('setLoading', true)
      firebase.database().ref('/users/' + getters.user.id + '/favorites/')
        .once('value')
        .then(data => {
          const dataPairs = data.val()
          let favoritedProducts = []
          let swappedPairs = {}
          for (let key in dataPairs) {
            favoritedProducts.push(dataPairs[key])
            swappedPairs[dataPairs[key]] = key
          }
          const updatedUser = {
            id: getters.user.id,
            favoritedProducts: favoritedProducts,
            fbKeys: swappedPairs
          }
          commit('setLoading', false)
          commit('setUser', updatedUser)
        })
        .catch(error => {
          commit('setLoading', false)
          console.log(error)
        })
    },
    logout({commit}) {
      firebase.auth().signOut()
      commit('setUser', null)
    },
    clearError({commit}) {
      commit('clearError')
    }
  },
  getters: {
    loadedProducts(state) {
      return state.loadedProducts.sort((productA, productB) => {
        return productA.date < productB.date
      })
    },
    loadedProduct(state) {
      return (productId) => {
        return state.loadedProducts.find((product) => {
          return product.id === productId
        })
      }
    },
    featuredProducts(state, getters) {
      return getters.loadedProducts.slice(0,5)
    },
    getProductsWithFlexProperty(state, getters) {
      let loadedProducts = getters.loadedProducts
      loadedProducts.forEach((el, i) => {
        if (i % 3) el['flex'] = 6
        else el['flex'] = 12
      });
      return loadedProducts
    },
    user(state) {
      return state.user
    },
    loading(state) {
      return state.loading
    },
    error(state) {
      return state.error
    }
  }
})