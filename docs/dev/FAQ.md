# FAQ

- Q. 既存のアプリ（例えば管理者ツール）を改良しようと思い，そのアプリに対応する    ディレクトリ（例えばadmin）を（例えばadmin_copyという名前で）複製したのですが，ブラウザで
  
  ```
  http://localhost:8081/kbfira_docs/index.php/admin_copy/
  ```
  
  などにアクセスしても
  
  ```
  {“coreStatus”:false,“coreError”:“Invalid app controller or controller not found: HomeController.“}
  ```
  
  のようなエラーが出ます．どうしたらいいですか？
  
  - A. Ubuntu Serverにログインしているユーザが所有者になっていなかったり，複製したディレクトリのアクセス権がなかったりしている可能性があります．
    
    ひとまず，システムのソースコードが置かれているフォルダで
    
    ```
    ll
    ```
    
    コマンド（厳密には，ls -lのエイリアス）を実行してみてください．
    
    admin_copyディレクトリの部分の結果が
    
    ```
    drwx------  9   501 dialout  288 Jul 16 06:04 admin_copy/
    ```
    
    のようになっている場合は，まずchownコマンドでディレクトリの所有者を変更しましょう（以下は，ユーザ名が"kodai"である場合の例）：
    
    ```
    sudo chown kodai:kodai admin_copy
    ```
    
    chownコマンドを実行したら，再度
    
    ```
    ll
    ```
    
    コマンドを実行し，ディレクトリの所有者が変わっていることを確認します：
    
    ```
    drwx------  9 kodai kodai    288 Jul 18 05:09 admin_copy/
    ```
    
    確認できたら，次はchmodコマンドでアクセス権を付与していきます（Rオプションを付与することで，ディレクトリ内の全てのファイルのアクセス権を変更）：
    
    ```
    sudo chmod 775 -R admin_copy
    ```
    
    再度
    
    ```
    ll
    ```
    
    コマンドを実行し，
    
    ```
    drwxrwxr-x  9 kodai kodai    288 Jul 18 05:09 admin_copy/
    ```
    
    のようにアクセス権が変更されていることを確認しましょう．念のため，"drwx..."となっている部分や"kodai kodai"となっている部分がコピー元のディレクトリ（この場合はadmin）と揃っていることも確認しておいてください（ちなみに，llコマンドの実行結果の意味は[【Linux】llコマンド(ls -lコマンド)の表示の見方:めもめも](http://ilovelovemoney.blog.fc2.com/blog-entry-112.html)などに書いてあります）．
    
    以上の作業が終わったら，再度
    
    ```
    http://localhost:8081/kbfira_docs/index.php/admin_copy/
    ```
    
    にアクセスしてみてください．問題が解決していることを祈っています．

- Q. （研究室内部向け）現在，KBのソースコードが動いている研究室のサーバにログインしてみたいのですが，どうしたらいいですか？
  
  - A. 公開リポジトリに置かれているファイルにそのようなことを書くわけにはいかないので，[こちら](https://hiroshimauniv.sharepoint.com/:w:/s/msteams_451b22-teams/EQzO1bogqsxArqZ7VfpK2kwBfItm68bhbYwiz9pkyfSBGA?e=xYbntS)を参照してください．

- Q. 開発したアプリケーションをサーバにデプロイするには，どうしたらいいですか？
  
  - A. （研究室内部向け）~~ひとまず，先輩の[引き継ぎ資料](https://hiroshimauniv.sharepoint.com/:w:/s/msteams_451b22-teams/Ef7jNV8yhzZInxgkspDEWS4Bj5nNdRhCjXPlpZnQN1thlg?e=5wj25g)を参照してください．補足等が必要になれば，別途，追記するようにします．~~
    ←先輩の引き継ぎ資料は，恐らく古いバージョンのシステムについてのものなので，一旦取り消し線を引いておきました（全く参考にならないわけではないと思うので，削除，はしていません）
- Q. コントローラのファイルで
  
  ```
  $this->ui->usePlugin('kitbuild-ui', 'kitbuild', 'kitbuild-analyzer', 'kitbuild-logger', 'kitbuild-collab', 'general-ui', 'showdown', 'highlight');
  ```
  
  というような記述を見かけますが，これはどういう意味なのでしょうか？
  - A. usePlugin()で.shared/config/plugins.ini内のキーを指定することにより，シンプルな記述で関連するファイルをまとめて読み込んだりすることができるようになっています．プラグインにも自作のものと公開されているものを読み込んでいるものがあり，例えば上の例だと'showdown'と'highlight'以外は前者に該当します．ちなみに，後者のうち，上の例にある'showdown'はMarkdownをHTMLに変換するためのライブラリで，highlightはWebページ上に表示したプログラミングコードなどに色を付けるためのライブラリになっています．

- Q. リンクにボタンを追加させたいのですが，どうすればよいのでしょうか？
  - A.  kit-build/asset/kbui.canvas.tool.jsに追加させたいボタンの機能に関するclassを追加する．kit-build/asset/recompose.js（学習者の操作の際に読み込まれるファイル）に，kbui.canvas.tool.jsに追加したclassを呼び出す記述を追加する．ボタンはbootstrap Iconsからテンプレートを使う（ただし，大きさの調整のためにSVGタグのviewBoxの値を"-4 -4 24 24"に変更する）． ボタンの位置は(0,0)を真ん中として，(-1,-1)が左上，(1,1)が右下になる．

  ボタンの位置
  ```
  ───────────────────────
  │(-1,-1)│(0,-1)│(1,-1)│
  ───────────────────────
  │(-1, 0)│(0, 0)│(1, 0)│
  ───────────────────────
  │(-1, 1)│(0, 1)│(1, 1)│
  ───────────────────────
  ```

  asset\vendor\kitbuild\kbui.canvas.tool.jsに記述する内容
  ```
  class KitBuildBugTool extends KitBuildCanvasTool {

  /**

   * @constructs KitBuildBugTool

   * @description 最後にhandleEvent()を呼んでいる

   * @param {Object} canvas Cytoscape.jsの描画対象となるcanvas要素

   * @param {Object} options ツール描画にあたってのオプション

   */

  constructor(canvas, options) {

    super(

      canvas,

      Object.assign(

        {

          showOn: KitBuildCanvasTool.SH_CONCEPT | KitBuildCanvasTool.SH_LINK,

          dialogContainerSelector: 'body',

          color: "#dc3545",

          width: '300px',

          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-input-cursor-text" viewBox="-6 -6 28 28">  <path d="M4.355.522a.5.5 0 0 1 .623.333l.291.956A4.979 4.979 0 0 1 8 1c1.007 0 1.946.298 2.731.811l.29-.956a.5.5 0 1 1 .957.29l-.41 1.352A4.985 4.985 0 0 1 13 6h.5a.5.5 0 0 0 .5-.5V5a.5.5 0 0 1 1 0v.5A1.5 1.5 0 0 1 13.5 7H13v1h1.5a.5.5 0 0 1 0 1H13v1h.5a1.5 1.5 0 0 1 1.5 1.5v.5a.5.5 0 1 1-1 0v-.5a.5.5 0 0 0-.5-.5H13a5 5 0 0 1-10 0h-.5a.5.5 0 0 0-.5.5v.5a.5.5 0 1 1-1 0v-.5A1.5 1.5 0 0 1 2.5 10H3V9H1.5a.5.5 0 0 1 0-1H3V7h-.5A1.5 1.5 0 0 1 1 5.5V5a.5.5 0 0 1 1 0v.5a.5.5 0 0 0 .5.5H3c0-1.364.547-2.601 1.432-3.503l-.41-1.352a.5.5 0 0 1 .333-.623zM4 7v4a4 4 0 0 0 3.5 3.97V7H4zm4.5 0v7.97A4 4 0 0 0 12 11V7H8.5zM12 6a3.989 3.989 0 0 0-1.334-2.982A3.983 3.983 0 0 0 8 2a3.983 3.983 0 0 0-2.667 1.018A3.989 3.989 0 0 0 4 6h8z"/></svg>',

          gridPos: { x: -1, y: -1 },

        },

        options

      )

    );  

    this.handleEvent();

  }



  /**

   * @function action ツールのボタンが押された際に発火する関数．broadcastEvent()をしている．

   * @param {string} event イベントの種類

   * @param {e} e 現在発火しているイベント

   * @param {Object} nodes 押されたツールのボタンに対応する部品のオブジェクト

   * @return {undefined}

   * @memberof KitBuildBugTool

   */

  action(event, e, nodes) {

    // console.error(event, e, nodes, this);

    this.node = nodes[0];

    this.broadcastEvent(`action`, {node: this.node.data()});

    return;

  }



  /**

   * @function handleEvent イベントハンドラを定義する関数

   * @memberof KitBuildBugTool

   */

  handleEvent() {

    /**

     * bug-dialog（ツールのボタンが押された際に表示されるダイアログ）内のbt-set-bug（"Set Bug"ボタン）が押された際に発火する関数．フォームから正しいラベルとバグを取得し，node.dataに追加する．

     * @param {e} e 現在発火しているclickイベント

     * @todo this.dialogがどこから来ているかは不明だが，this.dialog.hide()ではbug-dialogを隠してくれている

     */

    $('#bug-dialog').on('click', '.bt-set-bug', (e) => {

      let bugLabel = $('#bug-dialog .input-bug-label').val();

      let correctLabel = $('#bug-dialog .input-correct-label').val();

      this.node.data('correct-label', correctLabel);

      this.node.data('bug-label', bugLabel);

      UI.info('Bug information has been set.').show();

      if (this.dialog) this.dialog.hide();

      // console.log(this.node.data(), correctLabel, bugLabel, this, this.dialog);

    });



    /**

     * bug-dialog（ツールのボタンが押された際に表示されるダイアログ）内のbt-remove-bug（"Remove Bug"ボタン）が押された際に発火する関数．"Bug Label"のフォームを空にし，node.dataからcorrect-labelとbug-labelを削除する．

     * @param {e} e 現在発火しているclickイベント

     */

    $('#bug-dialog').on('click', '.bt-remove-bug', (e) => {

      let correctLabel = this.node.data('correct-label');

      if (correctLabel) { // correctLabelを"Correct Label"のフォームの内容および部品のラベルとして設定

        $('#bug-dialog .input-correct-label').val(correctLabel);

        this.node.data('label', correctLabel);

      }

      $('#bug-dialog .input-bug-label').val('');

      this.node.removeData('correct-label bug-label');

      // console.log(this.node.data(), correctLabel);

    });

  }

}
  ```

  admin/module/cmap/mekekit.jsに追加する文（bugToolの場合）
  ```
  this.bugTool = new KitBuildBugTool(canvas, {
    dialogContainerSelector: '#admin-content-panel'
  });
  this.bugTool.on('event', this.onBugToolEvent.bind(this));
  canvas.canvasTool.addTool("bug", this.bugTool);
  ```

