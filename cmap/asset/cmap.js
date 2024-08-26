$(() => {
  // jQuery onReady callback
  let app = CmapApp.instance();
});

class L {
  static log() {}
}

class CmapApp {
  constructor() {
    this.kbui = KitBuildUI.instance(CmapApp.canvasId);
    let canvas = this.kbui.canvases.get(CmapApp.canvasId);
    canvas.addToolbarTool(KitBuildToolbar.UNDO_REDO, { priority: 3 });
    canvas.addToolbarTool(KitBuildToolbar.NODE_CREATE, { priority: 2 });
    canvas.addToolbarTool(KitBuildToolbar.UTILITY, { priority: 5 });
    canvas.addToolbarTool(KitBuildToolbar.CAMERA, { priority: 4 });
    canvas.addToolbarTool(KitBuildToolbar.SHARE, { priority: 6 });
    canvas.addToolbarTool(KitBuildToolbar.LAYOUT, { priority: 7 });
    canvas.toolbar.render();

    canvas.addCanvasTool(KitBuildCanvasTool.DELETE);
    canvas.addCanvasTool(KitBuildCanvasTool.DUPLICATE);
    canvas.addCanvasTool(KitBuildCanvasTool.EDIT);
    canvas.addCanvasTool(KitBuildCanvasTool.SWITCH);
    canvas.addCanvasTool(KitBuildCanvasTool.DISCONNECT);
    canvas.addCanvasTool(KitBuildCanvasTool.CENTROID);
    canvas.addCanvasTool(KitBuildCanvasTool.CREATE_CONCEPT);
    canvas.addCanvasTool(KitBuildCanvasTool.CREATE_LINK);
    canvas.addCanvasTool(KitBuildCanvasTool.LOCK); // also UNLOCK toggle

    canvas.addCanvasMultiTool(KitBuildCanvasTool.DELETE);
    canvas.addCanvasMultiTool(KitBuildCanvasTool.DUPLICATE);
    canvas.addCanvasMultiTool(KitBuildCanvasTool.LOCK);
    canvas.addCanvasMultiTool(KitBuildCanvasTool.UNLOCK);

    this.canvas = canvas;

    this.session = Core.instance().session();
    this.ajax = Core.instance().ajax();
    this.runtime = Core.instance().runtime();
    this.config = Core.instance().config();

    // Hack for sidebar-panel show/hide
    // To auto-resize the canvas.
    // let observer = new MutationObserver((mutations) => $(`#${canvas.canvasId} > div`).css('width', 0))
    // observer.observe(document.querySelector('#admin-sidebar-panel'), {attributes: true})
    // Enable tooltip;
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Browser lifecycle event
    KitBuildUI.addLifeCycleListener(CmapApp.onBrowserStateChange);

    // console.log(typeof Logger)
    if (typeof CmapLogger != "undefined") {
      let sessid = Core.instance().config().get("sessid");
      this.logger = CmapLogger.instance(null, 0, sessid, canvas).enable();
      CmapApp.loggerListener = this.logger.onCanvasEvent.bind(this.logger);
      L.log = this.logger.log.bind(this.logger);
      L.log(`init-${this.constructor.name}`);
      canvas.on("event", CmapApp.loggerListener);
    }

    this.handleEvent();
    this.handleRefresh();
  }

  static instance() {
    CmapApp.inst = new CmapApp();
    return CmapApp.inst;
  }

  setConceptMap(conceptMap = null) {
    console.warn("CONCEPT MAP SET:", conceptMap);
    this.conceptMap = conceptMap;
    if (conceptMap) {
      this.canvas.direction = conceptMap.map.direction;
      this.session.set("cmid", conceptMap.map.cmid);
      let status =
        `<span class="mx-2 d-flex align-items-center status-cmap">` +
        `<span class="badge rounded-pill bg-secondary">ID: ${conceptMap.map.cmid}</span>` +
        `<span class="text-secondary ms-2 text-truncate"><small>${conceptMap.map.title}</small></span>` +
        `</span>`;
      StatusBar.instance().remove(".status-cmap").append(status);
    } else {
      StatusBar.instance().remove(".status-cmap");
      this.session.unset("cmid");
    }
  }

  handleEvent() {
    let saveAsDialog = UI.modal("#concept-map-save-as-dialog", {
      onShow: () => {
        $("#concept-map-save-as-dialog .input-title").focus();
        // console.log(this)
        KitBuild.getTopicListOfGroups(this.user.gids.split(",")).then(
          (topics) => {
            let list = '<option value="">No topic associated</option>';
            topics.forEach((topic) => {
              let selected =
                this.conceptMap && this.conceptMap.map.topic == topic.tid
                  ? " selected"
                  : "";
              if (
                selected == "" &&
                CmapApp.topic &&
                CmapApp.topic.tid == topic.tid
              )
                selected = " selected";
              list += `<option value="${topic.tid}"${selected}>${topic.title}</option>`;
            });
            $("#select-topic").html(list);
          }
        );
      },
      hideElement: ".bt-cancel",
    });
    saveAsDialog.setConceptMap = (conceptMap) => {
      if (conceptMap) {
        saveAsDialog.cmid = conceptMap.map.cmid;
        $("#input-fid").val(conceptMap.map.cmfid);
        $("#input-title").val(conceptMap.map.title);
        $("#select-topic").val(conceptMap.map.topic);
        $("#select-text").val(conceptMap.map.text);
        saveAsDialog.create_time = conceptMap.map.create_time;
      } else {
        saveAsDialog.cmid = null;
        $("#input-fid").val("");
        $("#input-title").val("");
        $("#select-topic").val(null);
        $("#select-text").val(null);
      }
      return saveAsDialog;
    };
    saveAsDialog.setTitle = (title) => {
      $("#concept-map-save-as-dialog .dialog-title").html(title);
      return saveAsDialog;
    };
    saveAsDialog.setIcon = (icon) => {
      $("#concept-map-save-as-dialog .dialog-icon")
        .removeClass()
        .addClass(`dialog-icon bi bi-${icon} me-2`);
      return saveAsDialog;
    };

    let openDialog = UI.modal("#concept-map-open-dialog", {
      hideElement: ".bt-cancel",
      width: "650px",
    });

    let contentDialog = UI.modal("#content-dialog", {
      hideElement: ".bt-close",
      backdrop: false,
      get height() {
        return ($("body").height() * 0.7) | 0;
      },
      get offset() {
        return { left: ($("body").width() * 0.1) | 0 };
      },
      draggable: true,
      dragHandle: ".drag-handle",
      resizable: true,
      resizeHandle: ".resize-handle",
      minWidth: 375,
      minHeight: 200,
      onShow: () => {
        let sdown = new showdown.Converter({
          strikethrough: true,
          tables: true,
          simplifiedAutoLink: true,
        });
        sdown.setFlavor("github");
        let htmlText = contentDialog.text
          ? sdown.makeHtml(contentDialog.text.content)
          : "<em>Content text unavailable.</em>";
        $("#content-dialog .content").html(htmlText);
        hljs.highlightAll();
      },
    });
    contentDialog.setContent = (text, type = "md") => {
      contentDialog.text = text;
      return contentDialog;
    };
    contentDialog.on("event", (event, data) => {
      L.log(`content-${event}`, data);
    });

    let exportDialog = UI.modal("#concept-map-export-dialog", {
      hideElement: ".bt-cancel",
    });

    let cgpassDialog = UI.modal("#cgpass-dialog", {
      hideElement: ".bt-close",
    });

    /**
     *
     * New Map
     */

    $(".app-navbar .bt-new").on("click", () => {
      let proceed = () => {
        this.canvas.reset();
        CmapApp.inst.setConceptMap(null);
        UI.info("Canvas has been reset").show();
        L.log(
          "reset-concept-map",
          this.conceptMap ? this.conceptMap.map.cmid : null
        );
      };
      if (this.canvas.cy.elements().length > 0 || CmapApp.inst.conceptMap) {
        let confirm = UI.confirm(
          "Discard this map and create a new concept map from scratch?"
        )
          .positive(() => {
            proceed();
            confirm.hide();
            return;
          })
          .show();
        return;
      }
      proceed();
    });

    $(".app-navbar .bt-save").on("click", () => {
      // console.log(CmapApp.inst)
      if (!CmapApp.inst.conceptMap)
        $(".app-navbar .bt-save-as").trigger("click");
      else
        saveAsDialog
          .setConceptMap(CmapApp.inst.conceptMap)
          .setTitle("Save Concept Map (Update)")
          .setIcon("file-earmark-check")
          .show();
    });

    $(".app-navbar .bt-save-as").on("click", () => {
      if (this.canvas.cy.elements().length == 0) {
        UI.warning("Nothing to save. Canvas is empty.").show();
        return;
      }
      saveAsDialog
        .setConceptMap()
        .setTitle("Save Concept Map As...")
        .setIcon("file-earmark-plus")
        .show();
    });

    $("#concept-map-save-as-dialog .input-title").on("focusout", (e) => {
      if (
        $("#input-fid").val().match(/^ *$/) &&
        !saveAsDialog.cmid &&
        $(e.currentTarget).val().trim() != ""
      ) {
        $("#concept-map-save-as-dialog .bt-generate-fid").trigger("click");
        let fid = $("#input-fid").val();
        $("#input-fid").val(fid + parseInt(Math.random() * 100));
      } else $("#input-fid").val("");
    });

    $("#concept-map-save-as-dialog").on("click", ".bt-generate-fid", (e) => {
      // console.log(e)
      $("#input-fid").val(
        $("#input-title")
          .val()
          .replace(/\s/g, "")
          .substring(0, 15)
          .trim()
          .toUpperCase()
      );
      e.preventDefault();
    });

    $("#concept-map-save-as-dialog").on("click", ".bt-new-topic-form", (e) => {
      // console.log(e)
      $("#concept-map-save-as-dialog .form-new-topic").slideDown("fast");
      e.preventDefault();
    });

    $("#concept-map-save-as-dialog").on("submit", (e) => {
      e.preventDefault();
      // console.log($('#select-topic').val(), $('#select-topic').val().match(/^ *$/));
      let data = Object.assign(
        {
          cmid: saveAsDialog.cmid ? saveAsDialog.cmid : null,
          cmfid: $("#input-fid").val().match(/^ *$/)
            ? null
            : $("#input-fid").val().trim().toUpperCase(),
          title: $("#input-title").val(),
          direction: this.canvas.direction,
          topic: $("#select-topic").val().match(/^ *$/)
            ? null
            : $("#select-topic").val().trim(),
          // text: $('#select-text').val().match(/^ *$/) ? null : $('#select-text').val().trim(),
          type: CmapApp.defaultMapType,
          author: this.user ? this.user.username : null,
          create_time: null,
        },
        KitBuildUI.buildConceptMapData(this.canvas)
      ); // console.log(data); return
      this.ajax
        .post("kitBuildApi/saveConceptMap", { data: Core.compress(data) })
        .then((conceptMap) => {
          CmapApp.inst.setConceptMap(conceptMap);
          UI.success("Concept map has been saved successfully.").show();
          L.log(data.cmid ? "save-map" : "save-as-map", conceptMap.map, null, {
            cmid: conceptMap.map.cmid,
            includeMapData: true,
          });
          saveAsDialog.hide();
        })
        .catch((error) => {
          UI.error("Error saving concept map: " + error).show();
        });
    });

    /**
     *
     * Open
     */

    $(".app-navbar .bt-open").on("click", () => {
      openDialog.show();
      let tid = openDialog.tid;
      if (!tid)
        $("#concept-map-open-dialog .list-topic .list-item.default").trigger(
          "click"
        );
      else
        $(
          `#concept-map-open-dialog .list-topic .list-item[data-tid="${tid}"]`
        ).trigger("click");
      $(`#concept-map-open-dialog .bt-refresh-topic-list`).trigger("click");
    });

    $("#concept-map-open-dialog .list-topic").on("click", ".list-item", (e) => {
      if (openDialog.tid != $(e.currentTarget).attr("data-tid"))
        // different concept map?
        openDialog.cmid = null; // reset selected concept map id.
      openDialog.tid = $(e.currentTarget).attr("data-tid");
      $("#concept-map-open-dialog .list-topic .bi-check-lg").addClass("d-none");
      $("#concept-map-open-dialog .list-topic .list-item").removeClass(
        "active"
      );
      $(e.currentTarget).find(".bi-check-lg").removeClass("d-none");
      $(e.currentTarget).addClass("active");

      this.ajax
        .post(`kitBuildApi/getUserConceptMapListByTopic`, {
          username: this.user.username,
          tid: openDialog.tid == "" ? undefined : openDialog.tid,
        })
        .then((cmaps) => {
          // console.log(cmaps)
          let cmapsHtml = "";
          cmaps.forEach((cm) => {
            cmapsHtml +=
              `<span class="concept-map list-item" data-cmid="${cm.cmid}" data-cmfid="${cm.cmfid}">` +
              `<span class="text-truncate">${cm.title}</span>` +
              `<bi class="bi bi-check-lg text-primary d-none"></bi></span>`;
          });
          $("#concept-map-open-dialog .list-concept-map").slideUp({
            duration: 100,
            complete: () => {
              $("#concept-map-open-dialog .list-concept-map")
                .html(cmapsHtml)
                .slideDown({
                  duration: 100,
                  complete: () => {
                    if (openDialog.cmid) {
                      $(
                        `#concept-map-open-dialog .list-concept-map .list-item[data-cmid="${openDialog.cmid}"]`
                      )
                        .trigger("click")[0]
                        .scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    } else
                      $("#concept-map-open-dialog .list-concept-map").scrollTop(
                        0
                      );
                  },
                });
            },
          });
        });
    });

    $("#concept-map-open-dialog .list-concept-map").on(
      "click",
      ".list-item",
      (e) => {
        openDialog.cmid = $(e.currentTarget).attr("data-cmid");
        $("#concept-map-open-dialog .list-concept-map .bi-check-lg").addClass(
          "d-none"
        );
        $("#concept-map-open-dialog .list-concept-map .list-item").removeClass(
          "active"
        );
        $(e.currentTarget).find(".bi-check-lg").removeClass("d-none");
        $(e.currentTarget).addClass("active");
      }
    );

    $("#concept-map-open-dialog .bt-refresh-topic-list").on("click", () => {
      this.ajax.get("kitBuildApi/getTopicList").then((topics) => {
        // console.log(topics)
        let topicsHtml = "";
        topics.forEach((t) => {
          // console.log(t);
          topicsHtml +=
            `<span class="topic list-item align-items-center" data-tid="${t.tid}">` +
            `<span class="d-flex align-items-center">${t.title}` +
            (t.text
              ? `<span class="badge rounded-pill bg-success ms-2">Text</span>`
              : "") +
            `</span>` +
            `<bi class="bi bi-check-lg text-primary d-none"></bi></span>`;
        });
        $("#concept-map-open-dialog .list-topic").slideUp({
          duration: 100,
          complete: () => {
            $("#concept-map-open-dialog .list-topic .list-item")
              .not(".default")
              .remove();
            $("#concept-map-open-dialog .list-topic")
              .append(topicsHtml)
              .slideDown(100);
            $(
              `#concept-map-open-dialog .list-topic .list-item[data-tid="${openDialog.tid}"]`
            ).trigger("click");
          },
        });
      });
    });

    $("#concept-map-open-dialog").on("click", ".bt-open-topic", (e) => {
      e.preventDefault();
      if (!openDialog.tid) {
        UI.dialog("Please select a topic.").show();
        return;
      }
      this.ajax.get(`contentApi/getTopic/${openDialog.tid}`).then((topic) => {
        this.setTopic(topic);
        this.session.set("tid", openDialog.tid);
        L.log("open-topic", { tid: topic.tid, title: topic.title });
        openDialog.hide();
      });
    });

    $("#concept-map-open-dialog").on("click", ".bt-open", (e) => {
      e.preventDefault();

      let target = $("#open-concept-map-tab")
        .find(".nav-link.active")
        .attr("data-bs-target");
      let openPromise = [];
      if (target == "#database") {
        if (!openDialog.cmid) {
          UI.dialog("Please select a concept map.").show();
          return;
        }
        openPromise.push(
          new Promise((resolve, reject) => {
            KitBuild.openConceptMap(openDialog.cmid)
              .then((conceptMap) => {
                resolve(
                  Object.assign(conceptMap, {
                    cyData: KitBuildUI.composeConceptMap(conceptMap),
                  })
                );
              })
              .catch((error) => {
                reject(error);
              });
          })
        );
      } else {
        // #decode
        openPromise.push(
          new Promise((resolve, reject) => {
            try {
              let data = $("#decode-textarea").val().trim();
              let conceptMap = Core.decompress(data);
              resolve(
                Object.assign(conceptMap, {
                  cyData: KitBuildUI.composeConceptMap(conceptMap),
                })
              );
            } catch (error) {
              reject(error);
            }
          })
        );
      }
      if (openPromise.length)
        Promise.any(openPromise)
          .then((conceptMap) => {
            // console.log(conceptMap)
            let proceed = () => {
              CmapApp.inst.setConceptMap(conceptMap);
              this.canvas.cy.elements().remove();
              this.canvas.cy.add(conceptMap.cyData);
              this.canvas.applyElementStyle();
              this.canvas.toolbar.tools
                .get(KitBuildToolbar.CAMERA)
                .fit(null, { duration: 0 });
              this.canvas.toolbar.tools
                .get(KitBuildToolbar.NODE_CREATE)
                .setActiveDirection(conceptMap.map.direction);
              this.canvas.canvasTool.clearCanvas().clearIndicatorCanvas();
              UI.success("Concept map loaded.").show();
              L.log("open-concept-map", conceptMap.map, null, {
                cmid: conceptMap.map.cmid,
                includeMapData: true,
              });
              openDialog.hide();
              CmapApp.collab(
                "command",
                "set-concept-map",
                conceptMap,
                conceptMap.cyData
              );
            };
            if (this.canvas.cy.elements().length) {
              let confirm = UI.confirm(
                "Do you want to open and replace current concept map on canvas?"
              )
                .positive(() => {
                  confirm.hide();
                  proceed();
                })
                .show();
            } else proceed();
          })
          .catch((error) => {
            console.error(error.errors);
            L.log("open-concept-map-error", { cmid: openDialog.cmid });
            UI.dialog("The concept map data is invalid.", {
              icon: "exclamation-triangle",
              iconStyle: "danger",
            }).show();
          });
    });

    /**
     *
     * Export
     */

    $(".app-navbar .bt-export").on("click", (e) => {
      // console.log(e)
      let canvasData = KitBuildUI.buildConceptMapData(this.canvas);
      canvasData.direction = this.canvas.direction;
      if (CmapApp.inst.conceptMap && CmapApp.inst.conceptMap.map)
        canvasData.map = CmapApp.inst.conceptMap.map;
      else
        canvasData.map = {
          cmid: null,
          cmfid: null,
          title: "Untitled",
          direction: this.canvas.direction,
          topic: null,
          text: null,
          author: this.user ? this.user.username : null,
          create_time: null,
        };
      $("#concept-map-export-dialog .encoded-data").val(
        Core.compress(canvasData)
      );
      exportDialog.show();
    });

    $("#concept-map-export-dialog").on("click", ".bt-clipboard", (e) => {
      navigator.clipboard.writeText(
        $("#concept-map-export-dialog .encoded-data").val().trim()
      );
      $(e.currentTarget).html(
        '<i class="bi bi-clipboard"></i> Data has been copied to Clipboard!'
      );
      setTimeout(() => {
        $(e.currentTarget).html(
          '<i class="bi bi-clipboard"></i> Copy to Clipboard'
        );
      }, 3000);
    });

    /**
     * Content
     * */

    $(".app-navbar").on("click", ".bt-content", () => {
      // console.log(KitBuildApp.inst)
      if (!CmapApp.topic) {
        UI.dialog("Please open a topic to see its content.").show();
        return;
      }
      if (!CmapApp.topic.text) {
        UI.dialog("This topic does not have any content.").show();
        return;
      }
      if (!contentDialog.text || contentDialog.text.tid != CmapApp.topic.text)
        this.ajax
          .get(`kitBuildApi/getTextOfTopic/${CmapApp.topic.text}`)
          .then((text) => {
            this.setText(text);
            this.session.set("txid", text.tid);
            contentDialog.setContent(text).show();
            L.log("show-content", { tid: text.tid, title: text.title });
          });
      else contentDialog.show();
    });

    $("#kit-content-dialog .bt-scroll-top").on("click", (e) => {
      $("#kit-content-dialog .content").parent().animate({ scrollTop: 0 }, 200);
      L.log("scroll-top-content");
    });

    $("#kit-content-dialog .bt-scroll-more").on("click", (e) => {
      let height = $("#kit-content-dialog .content").parent().height();
      let scrollTop = $("#kit-content-dialog .content").parent().scrollTop();
      $("#kit-content-dialog .content")
        .parent()
        .animate({ scrollTop: scrollTop + height - 16 }, 200);
      L.log("scroll-more-content");
    });

    /**
     *
     * Change password
     */
    $(".app-navbar .cgpass").on("click", (e) => {
      e.preventDefault();
      this.session.get("user").then(
        (user) => {
          // console.log(user);
          $("#cgpass-dialog .user-username").html(user.username);
          $("#cgpass-dialog .user-name").html(user.name);
          $('#form-cgpass input[name="username"]').val(user.username);
          cgpassDialog.show();
        },
        (error) => {
          console.error(error);
          UI.errorDialog(error);
        }
      );
    });
    $("#form-cgpass").on("submit", (e) => {
      e.preventDefault();

      let username = $('#form-cgpass input[name="username"]').val();
      // console.log(username);

      let p0 = $("#password0").val();
      let p1 = $("#password1").val();
      let p2 = $("#password2").val();

      let valid = true;

      if (p0 === "") {
        $(".password0.invalid-feedback").text(
          "Please provide your current password."
        );
        $("#password0").addClass("is-invalid");
        valid = false;
      } else $("#password0").removeClass("is-invalid").addClass("is-valid");

      if (p1 === "") {
        $(".password1.invalid-feedback").text("New password cannot be empty.");
        $("#password1").addClass("is-invalid");
        valid = false;
      } else $("#password1").removeClass("is-invalid").addClass("is-valid");

      if (p2 === "") {
        $(".password2.invalid-feedback").text(
          "New password (repeat) cannot be empty."
        );
        $("#password2").addClass("is-invalid");
        valid = false;
      } else $("#password2").removeClass("is-invalid").addClass("is-valid");

      if (!valid) return;

      if (p1 != p2) {
        $(".password1.invalid-feedback").text(
          "New password and new password (repeat) must be equal"
        );
        $("#password1").addClass("is-invalid");
        $("#password2").addClass("is-invalid");
        return;
      } else if (
        !(p1.match(/[a-z]+/gi) && p1.match(/[0-9]+/gi) && p1.length >= 8)
      ) {
        $(".password1.invalid-feedback").text(
          "Password must contains alphanumeric characters (a-z, 0-9) with at least consisted of 8 or more characters."
        );
        $("#password1").addClass("is-invalid");
        return;
      } else {
        $("#password1").removeClass("is-invalid");
        $("#password2").removeClass("is-invalid");
      }

      $("#password1").addClass("is-valid");
      $("#password2").addClass("is-valid");

      this.ajax
        .post("RBACApi/changeUserPassword", {
          username: username,
          currentPassword: p0, // current password
          password: p1, // new password
          passwordRepeat: p2, // new password repeat
        })
        .then(
          (result) => {
            // console.log(result);
            if (result) {
              cgpassDialog.hide();
              UI.successDialog(
                '<span class="text-success">Password has been successfully changed.</span> <br> Next time you log in you will need to use the new password.'
              ).show();
            } else
              UI.errorDialog(
                "Password change error. Incorrect old password or new password is equal to old password."
              ).show();
          },
          (error) => {
            // console.error(error);
            UI.errorDialog(
              "Password change error. Incorrect old password or new password is equal to old password."
            ).show();
          }
        );

      // let valid = e.currentTarget.checkValidity();
      // console.log(valid);
      // $(e.currentTarget).addClass('was-validated');
    });

    /**
     *
     * Logout
     */
    $(".app-navbar .bt-logout").on("click", (e) => {
      let confirm = UI.confirm(
        'Do you want to logout?<br>This will <strong class="text-danger">END</strong> your concept mapping session.'
      )
        .positive(() => {
          L.log("logout", {
            username: this.user.username,
            name: this.user.name,
          });
          Core.instance()
            .session()
            .unset("user")
            .then(() => {
              CmapApp.inst.setConceptMap(null);
              KitBuildCollab.enableControl(false);
              CmapApp.enableNavbarButton(false);
              CmapApp.updateSignInOutButton();
              StatusBar.instance().remove(".status-user");
              if (CmapApp.collabInst) CmapApp.collabInst.disconnect();
              this.canvas.cy.elements().remove();
              this.canvas.canvasTool.clearCanvas().clearIndicatorCanvas();
              this.canvas.toolbar.tools
                .get(KitBuildToolbar.UNDO_REDO)
                .clearStacks()
                .updateStacksStateButton();
              this.logger.seq = 0;
              UI.success("You have signed out.").show();
              StatusBar.instance().clear();
              confirm.hide();
            });
          Core.instance().session().destroy();
          // TODO: redirect to home/login page
        })
        .show();
    });

    /**
     *
     * Sign In
     */
    $(".app-navbar .bt-sign-in").on("click", (e) => {
      L.log("show-sign-in-dialog");
      this.runtime.load("config.ini").then((runtimes) => {
        let runtimeGids = runtimes["sign-in-group"];
        // console.log(runtimes, runtimeGids);
        CmapApp.inst.modalSignIn = SignIn.instance({
          gids: runtimeGids ?? null,
          success: (user) => {
            L.log("sign-in-success", user);
            this.session.set("user", user);
            this.setUser(user);
            this.initCollab(user);
            CmapApp.enableNavbarButton();
            CmapApp.updateSignInOutButton();
            CmapApp.inst.modalSignIn.hide();
            KitBuildCollab.enableControl();
            let status =
              `<span class="mx-2 d-flex align-items-center status-user">` +
              `<small class="text-dark fw-bold">${user.name}</small>` +
              `</span>`;
            StatusBar.instance().remove(".status-user").prepend(status);
            this.logger.username = user.username;
            // Save initial map!
            let data = Object.assign(
              {
                cmid: null,
                cmfid: null,
                title: "Untitled",
                direction: this.canvas.direction,
                topic: null,
                text: null,
                type: CmapApp.defaultMapType,
                author: this.user.username,
                create_time: null,
              },
              KitBuildUI.buildConceptMapData(this.canvas)
            ); // console.log(data); return
            this.ajax
              .post("kitBuildApi/saveConceptMap", { data: Core.compress(data) })
              .then((conceptMap) => {
                this.setConceptMap(conceptMap);
                this.logger.setConceptMapId(conceptMap.map.cmid);
                UI.success("Concept map has been initialized.").show();
                L.log("cmap-initialized-empty", conceptMap.map);
              })
              .catch((error) => {
                UI.error("Error saving concept map: " + error).show();
              });
          },
        }).show();
      });
      // console.log("STATE DATA: ", stateData)
      // console.log(this.runtime, runtimeGids);
    });
  }

  setUser(user = null) {
    this.user = user;
  }

  setTopic(topic) {
    CmapApp.topic = topic;
    let statusTopic =
      "" +
      `<span class="status-topic d-flex align-items-center">` +
      `  <span class="badge rounded-pill bg-primary ms-2">${topic.title}</span>` +
      `</span>`;
    StatusBar.instance().remove(".status-topic").append(statusTopic);
  }

  setText(text) {
    CmapApp.text = text;
    let statusText =
      "" +
      `<span class="status-text d-flex align-items-center">` +
      `  <span class="badge rounded-pill bg-success ms-2">${text.title}</span>` +
      `</span>`;
    StatusBar.instance().remove(".status-text").append(statusText);
  }

  handleRefresh() {
    let session = Core.instance().session();
    let stateData = JSON.parse(localStorage.getItem(CmapApp.name));
    // console.log("STATE DATA: ", stateData)
    session.getAll().then((sessions) => {
      try {
        if (stateData.logger) {
          // restore previous logger data and sequence
          this.logger.username = sessions.user ? sessions.user.username : null;
          this.logger.seq = stateData.logger.seq;
          this.logger.sessid = Core.instance().config().get("sessid");
          this.logger.canvas = this.canvas;
          this.logger.enable();

          // re-bind logger as canvas event listener
          if (CmapApp.loggerListener)
            this.canvas.off("event", CmapApp.loggerListener);
          CmapApp.loggerListener = this.logger.onCanvasEvent.bind(this.logger);
          this.canvas.on("event", CmapApp.loggerListener);
        }
      } catch (error) {
        console.warn(error);
      }

      let cmid = sessions.cmid;
      if (cmid)
        KitBuild.openConceptMap(cmid).then((conceptMap) => {
          this.setConceptMap(conceptMap);
          if (!conceptMap) return;
          if (stateData && stateData.map) {
            // console.log(stateData.direction)
            this.canvas.cy.elements().remove();
            this.canvas.cy.add(Core.decompress(stateData.map));
            this.canvas.applyElementStyle();
            this.canvas.toolbar.tools
              .get(KitBuildToolbar.NODE_CREATE)
              .setActiveDirection(stateData.direction);
          } else {
            this.canvas.cy.add(KitBuildUI.composeConceptMap(conceptMap));
            this.canvas.toolbar.tools
              .get(KitBuildToolbar.NODE_CREATE)
              .setActiveDirection(conceptMap.map.direction);
          }
          this.canvas.toolbar.tools
            .get(KitBuildToolbar.CAMERA)
            .fit(null, { duration: 0 });
          this.canvas.cy.elements(":selected").unselect();
          this.logger.setConceptMapId(this.conceptMap.map.cmid);
          L.log(
            "restore-concept-map",
            conceptMap ? conceptMap.map : null,
            null,
            {
              includeMapData: conceptMap ? true : false,
            }
          );
        });
      let tid = sessions.tid;
      let txid = sessions.txid;
      if (tid)
        this.ajax.get(`contentApi/getTopic/${tid}`).then((topic) => {
          this.setTopic(topic);
          L.log("restore-topic", { topic: topic ? topic.tid : null });
        });
      if (txid)
        this.ajax.get(`kitBuildApi/getTextOfTopic/${txid}`).then((text) => {
          this.setText(text);
          L.log("restore-text", { text: text ? text.tid : null });
        });

      // init collaboration feature
      CmapApp.enableNavbarButton(false);
      if (sessions.user) {
        this.setUser(sessions.user);
        this.initCollab(sessions.user);
        CmapApp.enableNavbarButton();
        KitBuildCollab.enableControl();
        this.logger.username = sessions.user.username;
        let status =
          `<span class="mx-2 d-flex align-items-center status-user">` +
          `<small class="text-dark fw-bold">${sessions.user.name}</small>` +
          `</span>`;
        StatusBar.instance().remove(".status-user").prepend(status);
      } else $(".app-navbar .bt-sign-in").trigger("click");

      // listen to events for broadcast to collaboration room as commands
      this.canvas.on("event", CmapApp.onCanvasEvent);
    });
  }

  initCollab(user) {
    CmapApp.collabInst = KitBuildCollab.instance("cmap", user, this.canvas, {
      host: this.config.get("collabhost"),
      port: this.config.get("collabport"),
    });
    CmapApp.collabInst.off("event", CmapApp.onCollabEvent);
    CmapApp.collabInst.on("event", CmapApp.onCollabEvent);
    KitBuildCollab.enableControl();
  }
}

CmapApp.canvasId = "goalmap-canvas";
CmapApp.defaultMapType = "scratch";

CmapApp.onBrowserStateChange = (event) => {
  // console.warn(event)
  L.log("browser-state-change", { from: event.oldState, to: event.newState });
  if (event.newState == "terminated") {
    let stateData = {};
    if (CmapApp.inst && CmapApp.inst.logger)
      stateData.logger = {
        username: CmapApp.inst.logger.username,
        seq: CmapApp.inst.logger.seq,
        sessid: CmapApp.inst.logger.sessid,
        enabled: CmapApp.inst.logger.enabled,
      };
    stateData.map = Core.compress(CmapApp.inst.canvas.cy.elements().jsons());
    stateData.direction = $("#dd-direction .icon-active").data("direction");
    let cmapAppStateData = JSON.stringify(Object.assign({}, stateData));
    localStorage.setItem(CmapApp.name, cmapAppStateData);
  }
};

// convert concept mapping event to collaboration command
// App --> Server
CmapApp.collab = (action, ...data) => {
  // not connected? skip.
  if (!CmapApp.collabInst || !CmapApp.collabInst.connected()) return;

  switch (action) {
    case "command":
      {
        let command = data.shift();
        // console.warn(command, data);
        CmapApp.collabInst
          .command(command, ...data)
          .then((result) => {
            console.error(command, result);
          })
          .catch((error) => console.error(command, error));
      }
      break;
    case "get-map-state":
      {
        CmapApp.collabInst
          .getMapState()
          .then((result) => {})
          .catch((error) =>
            UI.error("Unable to get map state: " + error).show()
          );
      }
      break;
    case "send-map-state":
      {
        CmapApp.collabInst
          .sendMapState(...data)
          .then((result) => {})
          .catch((error) =>
            UI.error("Unable to send map state: " + error).show()
          );
      }
      break;
    case "get-channels":
      {
        CmapApp.collabInst.tools
          .get("channel")
          .getChannels()
          .then((channels) => {})
          .catch((error) =>
            UI.error("Unable to get channels: " + error).show()
          );
      }
      break;
  }
};
CmapApp.onCanvasEvent = (canvasId, event, data) => {
  CmapApp.collab("command", event, canvasId, data);
};

// handles incoming collaboration event
// Server --> App
CmapApp.onCollabEvent = (event, ...data) => {
  // console.warn(event, data)
  switch (event) {
    case "connect":
    case "reconnect":
      break;
    case "join-room":
      {
        CmapApp.collab("get-map-state");
      }
      break;
    case "socket-command":
      {
        let command = data.shift();
        CmapApp.processCollabCommand(command, data);
      }
      break;
    case "socket-get-map-state":
      {
        let requesterSocketId = data.shift();
        CmapApp.generateMapState().then((mapState) => {
          CmapApp.collab("send-map-state", requesterSocketId, mapState);
        });
      }
      break;
    case "socket-set-map-state":
      {
        let mapState = data.shift();
        CmapApp.applyMapState(mapState).then(() => {
          CmapApp.collab("get-channels");
        });
      }
      break;
  }
};
CmapApp.processCollabCommand = (command, data) => {
  console.log(command, data);
  switch (command) {
    case "set-concept-map":
      {
        let conceptMap = data.shift();
        let cyData = data.shift();
        console.log(conceptMap, cyData);
        CmapApp.inst.setConceptMap(conceptMap);
        CmapApp.inst.canvas.cy.elements().remove();
        CmapApp.inst.canvas.cy.add(cyData);
        CmapApp.inst.canvas.applyElementStyle();
        CmapApp.inst.canvas.canvasTool.clearCanvas().clearIndicatorCanvas();
        CmapApp.inst.canvas.toolbar.tools
          .get(KitBuildToolbar.CAMERA)
          .fit(null, { duration: 0 });
        CmapApp.inst.canvas.toolbar.tools
          .get(KitBuildToolbar.NODE_CREATE)
          .setActiveDirection(conceptMap.map.direction);
        CmapApp.inst.canvas.toolbar.tools
          .get(KitBuildToolbar.UNDO_REDO)
          .clearStacks()
          .updateStacksStateButton();
      }
      break;
    case "move-nodes":
      {
        let canvasId = data.shift();
        let moves = data.shift();
        let nodes = moves.later;
        if (Array.isArray(nodes))
          nodes.forEach((node) =>
            CmapApp.inst.canvas.moveNode(node.id, node.x, node.y, 200)
          );
      }
      break;
    case "redo-move-nodes":
    case "undo-move-nodes":
      {
        let canvasId = data.shift();
        let moves = data.shift();
        let nodes = moves;
        if (Array.isArray(nodes))
          nodes.forEach((node) =>
            CmapApp.inst.canvas.moveNode(node.id, node.x, node.y, 200)
          );
      }
      break;
    case "undo-centroid":
    case "undo-move-link":
    case "undo-move-concept":
      {
        let canvasId = data.shift();
        let move = data.shift();
        CmapApp.inst.canvas.moveNode(
          move.from.id,
          move.from.x,
          move.from.y,
          200
        );
      }
      break;
    case "centroid":
    case "redo-centroid":
    case "redo-move-link":
    case "redo-move-concept":
    case "move-link":
    case "move-concept":
      {
        let canvasId = data.shift();
        let move = data.shift();
        CmapApp.inst.canvas.moveNode(move.to.id, move.to.x, move.to.y, 200);
      }
      break;
    case "layout-elements":
      {
        let canvasId = data.shift();
        let layoutMoves = data.shift();
        let nodes = layoutMoves.later;
        if (Array.isArray(nodes))
          nodes.forEach((node) =>
            CmapApp.inst.canvas.moveNode(
              node.id,
              node.position.x,
              node.position.y,
              200
            )
          );
      }
      break;
    case "redo-layout-elements":
    case "undo-layout-elements":
    case "undo-layout":
      {
        let canvasId = data.shift();
        let nodes = data.shift();
        if (Array.isArray(nodes))
          nodes.forEach((node) =>
            CmapApp.inst.canvas.moveNode(
              node.id,
              node.position.x,
              node.position.y,
              200
            )
          );
      }
      break;
    case "undo-disconnect-right":
    case "undo-disconnect-left":
    case "redo-connect-right":
    case "redo-connect-left":
    case "connect-right":
    case "connect-left":
      {
        let canvasId = data.shift();
        let edge = data.shift();
        CmapApp.inst.canvas.createEdge(edge.data);
      }
      break;
    case "undo-connect-right":
    case "undo-connect-left":
    case "redo-disconnect-right":
    case "redo-disconnect-left":
    case "disconnect-left":
    case "disconnect-right":
      {
        let canvasId = data.shift();
        let edge = data.shift();
        CmapApp.inst.canvas.removeEdge(edge.data.source, edge.data.target);
      }
      break;
    case "undo-move-connect-left":
    case "undo-move-connect-right":
      {
        let canvasId = data.shift();
        let moveData = data.shift();
        CmapApp.inst.canvas.moveEdge(moveData.later, moveData.prior);
      }
      break;
    case "redo-move-connect-left":
    case "redo-move-connect-right":
    case "move-connect-left":
    case "move-connect-right":
      {
        let canvasId = data.shift();
        let moveData = data.shift();
        CmapApp.inst.canvas.moveEdge(moveData.prior, moveData.later);
      }
      break;
    case "switch-direction":
      {
        let canvasId = data.shift();
        let switchData = data.shift();
        CmapApp.inst.canvas.switchDirection(switchData.prior, switchData.later);
      }
      break;
    case "undo-disconnect-links":
      {
        let canvasId = data.shift();
        let edges = data.shift();
        if (!Array.isArray(edges)) break;
        edges.forEach((edge) => {
          CmapApp.inst.canvas.createEdge(edge.data);
        });
      }
      break;
    case "redo-disconnect-links":
    case "disconnect-links":
      {
        let canvasId = data.shift();
        let edges = data.shift();
        if (!Array.isArray(edges)) break;
        console.log(edges);
        edges.forEach((edge) => {
          CmapApp.inst.canvas.removeEdge(edge.data.source, edge.data.target);
        });
      }
      break;
    case "create-link":
    case "create-concept":
    case "redo-duplicate-link":
    case "redo-duplicate-concept":
    case "duplicate-link":
    case "duplicate-concept":
      {
        let canvasId = data.shift();
        let node = data.shift();
        console.log(node);
        CmapApp.inst.canvas.addNode(node.data, node.position);
      }
      break;
    case "undo-duplicate-link":
    case "undo-duplicate-concept":
      {
        let canvasId = data.shift();
        let node = data.shift();
        console.log(node);
        CmapApp.inst.canvas.removeElements([node.data]);
      }
      break;
    case "duplicate-nodes":
      {
        let canvasId = data.shift();
        let nodes = data.shift();
        if (!Array.isArray(nodes)) break;
        nodes.forEach((node) =>
          CmapApp.inst.canvas.addNode(node.data, node.position)
        );
      }
      break;
    case "undo-delete-node":
    case "undo-clear-canvas":
    case "undo-delete-multi-nodes":
      {
        let canvasId = data.shift();
        let elements = data.shift();
        CmapApp.inst.canvas.addElements(elements);
      }
      break;
    case "delete-link":
    case "delete-concept":
    case "redo-delete-multi-nodes":
    case "delete-multi-nodes":
      {
        let canvasId = data.shift();
        let elements = data.shift();
        CmapApp.inst.canvas.removeElements(
          elements.map((element) => element.data)
        );
      }
      break;
    case "undo-update-link":
    case "undo-update-concept":
      {
        let canvasId = data.shift();
        let node = data.shift();
        CmapApp.inst.canvas.updateNodeData(node.id, node.prior.data);
      }
      break;
    case "redo-update-link":
    case "redo-update-concept":
    case "update-link":
    case "update-concept":
      {
        let canvasId = data.shift();
        let node = data.shift();
        CmapApp.inst.canvas.updateNodeData(node.id, node.later.data);
      }
      break;
    case "redo-concept-color-change":
    case "undo-concept-color-change":
      {
        let canvasId = data.shift();
        let changes = data.shift();
        CmapApp.inst.canvas.changeNodesColor(changes);
      }
      break;
    case "concept-color-change":
      {
        let canvasId = data.shift();
        let changes = data.shift();
        let nodesData = changes.later;
        CmapApp.inst.canvas.changeNodesColor(nodesData);
      }
      break;
    case "undo-lock":
    case "undo-unlock":
    case "redo-lock":
    case "redo-unlock":
    case "lock-edge":
    case "unlock-edge":
      {
        let canvasId = data.shift();
        let edge = data.shift();
        CmapApp.inst.canvas.updateEdgeData(edge.id, edge);
      }
      break;
    case "undo-lock-edges":
    case "undo-unlock-edges":
    case "redo-lock-edges":
    case "redo-unlock-edges":
      {
        let canvasId = data.shift();
        let lock = data.shift();
        if (!lock) break;
        if (!Array.isArray(lock.edges)) break;
        lock.edges.forEach((edge) =>
          CmapApp.inst.canvas.updateEdgeData(edge.substring(1), {
            lock: lock.lock,
          })
        );
      }
      break;
    case "lock-edges":
    case "unlock-edges":
      {
        let canvasId = data.shift();
        let edges = data.shift();
        if (!Array.isArray(edges)) return;
        edges.forEach((edge) =>
          CmapApp.inst.canvas.updateEdgeData(edge.data.id, edge.data)
        );
      }
      break;
    case "redo-clear-canvas":
    case "clear-canvas":
      {
        CmapApp.inst.canvas.reset();
      }
      break;
    case "convert-type":
      {
        let canvasId = data.shift();
        let map = data.shift();
        let elements = map.later;
        let direction = map.to;
        CmapApp.inst.canvas.convertType(direction, elements);
      }
      break;
    case "select-nodes":
      {
        let canvasId = data.shift();
        let ids = data.shift();
        ids = ids.map((id) => `#${id}`);
        CmapApp.inst.canvas.cy.nodes(ids.join(", ")).addClass("peer-select");
      }
      break;
    case "unselect-nodes":
      {
        let canvasId = data.shift();
        let ids = data.shift();
        ids = ids.map((id) => `#${id}`);
        CmapApp.inst.canvas.cy.nodes(ids.join(", ")).removeClass("peer-select");
      }
      break;
  }
};

// generate/apply map state
CmapApp.generateMapState = () => {
  return new Promise((resolve, reject) => {
    let mapState = {
      conceptMap: null,
      cyData: [],
    };
    if (CmapApp.inst.conceptMap) {
      CmapApp.inst.conceptMap.map.direction = CmapApp.inst.canvas.direction;
      mapState = {
        conceptMap: CmapApp.inst.conceptMap,
        cyData: CmapApp.inst.canvas.cy.elements().jsons(),
      };
    }
    resolve(mapState);
  });
};
CmapApp.applyMapState = (mapState) => {
  return new Promise((resolve, reject) => {
    let conceptMap = mapState.conceptMap;
    let cyData = mapState.cyData;
    CmapApp.inst.setConceptMap(conceptMap);
    CmapApp.inst.canvas.cy.elements().remove();
    if (!conceptMap || !cyData) {
      // console.log(mapState)
    } else {
      CmapApp.inst.canvas.cy.add(cyData ? cyData : {}).unselect();
      CmapApp.inst.canvas.applyElementStyle();
      CmapApp.inst.canvas.toolbar.tools
        .get(KitBuildToolbar.CAMERA)
        .fit(null, { duration: 0 });
      CmapApp.inst.canvas.toolbar.tools
        .get(KitBuildToolbar.NODE_CREATE)
        .setActiveDirection(conceptMap.map.direction);
      CmapApp.inst.canvas.toolbar.tools
        .get(KitBuildToolbar.UNDO_REDO)
        .clearStacks()
        .updateStacksStateButton();
    }
    CmapApp.inst.canvas.canvasTool.clearCanvas().clearIndicatorCanvas();
    resolve(mapState);
  });
};

CmapApp.updateSignInOutButton = () => {
  Core.instance()
    .session()
    .getAll()
    .then((sessions) => {
      // console.log(sessions)
      if (sessions.user) {
        $(".bt-sign-in").addClass("d-none");
        $(".bt-logout").removeClass("d-none");
        $(".bt-profile").removeClass("d-none");
      } else {
        $(".bt-sign-in").removeClass("d-none");
        $(".bt-logout").addClass("d-none");
        $(".bt-profile").addClass("d-none");
      }
    });
};

CmapApp.enableNavbarButton = (enabled = true) => {
  $(".app-navbar .app-buttons button").prop("disabled", !enabled);
  CmapApp.inst.canvas.toolbar.tools.forEach((tool) => {
    tool.enable(enabled);
  });
};
