import { SwitchRouter } from 'react-navigation';
import DrawerActions from './DrawerActions';

function withDefaultValue(obj, key, defaultValue) {
  if (obj.hasOwnProperty(key) && typeof obj[key] !== 'undefined') {
    return obj;
  }

  obj[key] = defaultValue;
  return obj;
}

const getActiveRouteKey = route => {
  if (route.routes && route.routes[route.index]) {
    return getActiveRouteKey(route.routes[route.index]);
  }
  return route.key;
};

export default (routeConfigs, config = {}) => {
  config = { ...config };
  config = withDefaultValue(config, 'resetOnBlur', false);
  config = withDefaultValue(config, 'backBehavior', 'initialRoute');

  const switchRouter = SwitchRouter(routeConfigs, config);

  return {
    ...switchRouter,

    getActionCreators(route, navStateKey) {
      return {
        openDrawer: () => DrawerActions.openDrawer({ key: navStateKey }),
        closeDrawer: () => DrawerActions.closeDrawer({ key: navStateKey }),
        toggleDrawer: () => DrawerActions.toggleDrawer({ key: navStateKey }),
        ...switchRouter.getActionCreators(route, navStateKey),
      };
    },

    getStateForAction(action, state) {
      console.log(action);
      // Set up the initial state if needed
      if (!state) {
        return {
          ...switchRouter.getStateForAction(action, undefined),
          isDrawerOpen: false,
          requested: false,
        };
      }

      const isRouterTargeted = action.key == null || action.key === state.key;

      if (isRouterTargeted) {
        // Only handle actions that are meant for this drawer, as specified by action.key.

        if (action.type === DrawerActions.CLOSE_DRAWER && state.isDrawerOpen) {
          return {
            ...state,
            isDrawerOpen: false,
            requested: action.notify !== true,
          };
        }

        if (action.type === DrawerActions.OPEN_DRAWER && !state.isDrawerOpen) {
          return {
            ...state,
            isDrawerOpen: true,
            requested: action.notify !== true,
          };
        }

        if (action.type === DrawerActions.TOGGLE_DRAWER) {
          return {
            ...state,
            isDrawerOpen: !state.isDrawerOpen,
            requested: action.notify !== true,
          };
        }
      }

      // Fall back on switch router for screen switching logic, and handling of child routers
      const switchedState = switchRouter.getStateForAction(action, state);

      if (switchedState === null) {
        // The switch router or a child router is attempting to swallow this action. We return null to allow this.
        return null;
      }

      // Has the switch router changed the state?
      if (switchedState !== state) {
        if (getActiveRouteKey(switchedState) !== getActiveRouteKey(state)) {
          // If any navigation has happened, make sure to close the drawer
          return {
            ...switchedState,
            isDrawerOpen: false,
            requested: true,
          };
        }

        // At this point, return the state as defined by the switch router.
        // The active route key hasn't changed, so this most likely means that a child router has returned
        // a new state like a param change, but the same key is still active and the drawer will remain open
        return switchedState;
      }

      return state;
    },
  };
};
