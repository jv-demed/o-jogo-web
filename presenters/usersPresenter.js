export function userHaveCard(userObj, numberCard) {
    return userObj.cards?.includes(numberCard);
}