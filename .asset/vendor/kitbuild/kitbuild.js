/**
 * KBの組立過程でのインタラクションを管理するクラス
 */
class KitBuild {
  /**
   * マップのIDを受け取り，それに対応するマップをDBから取得して返す関数．IDが無効な場合はエラーを投げる．
   * @param {int} cmid マップのID
   * @return {*} cmidに対応するマップ
   */
  static openConceptMap(cmid) {
    if (!cmid) throw new Error(`Invalid Concept Map ID: ${cmid}`);
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/openConceptMap/${cmid}`)
  }

  /**
   * キットのIDを受け取って、それに対応するキットをDBから取得して返す関数．IDが無効な場合はエラーを投げる．
   * @param {int} kid キットのID
   * @return {*} kidに対応するキット
   */
  static openKitMap(kid) {
    if (!kid) throw new Error(`Invalid Kit Map ID: ${kid}`);
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/openKitMap/${kid}`)
  }
  
  /**
   * キットのIDを受け取って、それに対応するキットのセット(sets)？をDBから取得して返す関数．IDが無効な場合はエラーを投げる．
   * ※キットのセットが何かはわからない(extended KB における「部分マップ」の可能性がある)
   * @param {int} kid キットのID
   * @return {any} sets セットが取得できた場合、kidに対応するキットのセット
   * @return {promise<any>} promise セットが取得できずエラーが出力された場合、promiseインスタンス
   */
  static openKitSet(kid) {
    if (!kid) throw new Error(`Invalid Kit Map ID: ${kid}`);
    this.ajax = Core.instance().ajax()
    let promise = new Promise((resolve, reject) => {
      this.ajax.post(`kitBuildApi/getKitSets`, {
        kid: kid
      }).then(sets => {
        // console.warn(sets);
        resolve(sets);
        return sets;
      }).catch(error => {
        reject(null)
      })
    })
    return promise;
  }

  /**
   * キットのIDと設定(アップロード後に編集できるかとか)を受け取って、キットの設定をアップデートする(?)関数．IDが無効な場合はエラーを投げる．
   * @param {int} kid キットのID
   * @return {{kid: int, option: any}} kid:キットのID, option:キットの設定(e.g. {"modification":0} だったら「アップロード後に編集できないように設定を更新した」という意味)
   */
  static updateKitOption(kid, option) {
    if (!kid) throw new Error(`Invalid Kit Map ID: ${kid}`);
    this.ajax = Core.instance().ajax()
    return this.ajax.post(`kitBuildApi/updateKitOption`, {
      kid: kid,
      option: option
    })
  }

  /**
   * 学習者マップのIDを受け取って、対応する学習者マップを取得する関数．IDが無効な場合はエラーを投げる．
   * @param {any} lmid 学習者マップのID
   * @return {*} IDに対応する学習者マップ
   */
  static openLearnerMap(lmid) {
    if (!lmid) throw new Error(`Invalid Learner Map ID: ${lmid}`);
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/openLearnerMap/${lmid}`)
  }

  /**
   * 学習者マップのIDを受け取って、対応する部分(?)学習者マップを取得する関数．IDが無効な場合はエラーを投げる．
   * @param {any} lmid 学習者マップのID
   * @return {*} IDに対応する学習者マップ
   */
  static openExtendedLearnerMap(lmid) {
    if (!lmid) throw new Error(`Invalid Extended Learner Map ID: ${lmid}`);
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/openExtendedLearnerMap/${lmid}`)
  }

  /**
   * グループ名を受け取って、対応するトピックのリストを取得する関数．グループ名が無効だったり文字列長が0の場合はエラーを投げる．
   * @param {any[]} groups グループ名
   * @return {*} グループ名に対応するトピックのリスト
   */
  static getTopicListOfGroups(groups = []) {
    if (!groups || groups.length == 0) throw new Error('Invalid groups');
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/getTopicListOfGroups/${groups.join(",")}`);
  }

  /**
   * グループ名を受け取って、対応するキットのリストを取得する関数．グループ名が無効だったり文字列長が0の場合はエラーを投げる．
   * @param {any[]} groups グループ名
   * @return {*} グループ名に対応するキットのリスト
   */
  static getKitListOfGroups(groups = []) {
    if (!groups || groups.length == 0) throw new Error('Invalid groups');
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/getKitListOfGroups/${groups.join(",")}`);
  }

  /**
   * グループ名を受け取って、対応するユーザのリストを取得する関数．グループ名が無効だったり文字列長が0の場合はエラーを投げる．
   * @param {any[]} groups グループ名
   * @return {*} グループ名に対応するユーザのリスト
   */
  static getUserListOfGroups(groups = []) {
    if (!groups || groups.length == 0) throw new Error('Invalid groups');
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`RBACApi/getUserListOfGroups/${groups.join(",")}`);
  }

  /**
   * キットのIDを受け取って、対応するキットの名前(?)を取得する関数．
   * @param {string} kid キットのID
   * @return {*} キットの名前(?)
   */
  static getTextOfKit(kid = '') {
    this.ajax = Core.instance().ajax()
    return this.ajax.get(`kitBuildApi/getTextOfKit/${kid}`);
  }

}

/**
 * RBAC= Role-based access control
 * ログインとかユーザの登録とかを実行する
 */
class KitBuildRBAC {
  /**
   * ユーザ名とパスワードを受け取り，サインインする関数．ユーザ名が無効（空の文字列）な場合はエラーを投げる．
   * @param {string} username ユーザ名
   * @param {string} password パスワード
   * @return {{username: string, password: string}} ユーザ名とパスワード
   */
  static signIn(username, password = '') {
    if (!username) console.error('Invalid username');
    this.ajax = Core.instance().ajax()
    return this.ajax.post(`RBACApi/signIn`, {
      username: username,
      password: password
    })
  }
  /**
   * ユーザ名とパスワード, ロールIDとグループIDを受け取り，それに対応するマップをDBから取得して返す関数．IDが無効な場合はエラーを投げる．
   * @param {string} name ユーザの名前 (表示名 e.g. 田中恒成)
   * @param {string} username ユーザ名 (システム上の内部的な名前 (e.g.tanako))
   * @param {string} password パスワード
   * @param {string} rid ロールID ("ADMINISTRATOR" とか)
   * @param {string} gid グループID
   * @return {{username: any, password: string, name: string, rid: int, gid: int}} ユーザ名,パスワード,
   */
  static register (name, username, password, rid = null, gid = null) {
    if (!username) console.error('Invalid username');
    console.log(name, username, password, rid, gid)
    this.ajax = Core.instance().ajax()
    console.log("name: ", name, "username: ", username);
    return this.ajax.post(`RBACApi/register`, {
      username: username,
      password: password,
      name: name,
      rid: rid,
      gid: gid
    })
  }
}