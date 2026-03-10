import userService from "../services/userService";

export function login() {
  return userService.loginUser();
}
