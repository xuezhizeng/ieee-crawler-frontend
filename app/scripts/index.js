/**
 * Created by chenxs on 2016/5/30.
 */

'use strict';

$(async() => {
  Vue.config.delimiters = ['${', '}$'];
  Vue.config.unsafeDelimiters = ['{!!', '!!}'];

  const $tree = $('#tree');
  const treeData = [
    {
      text: '按标记分类',
      nodes: [
        {
          text: '所有未读',
          articleStatus: 0
        },
        {
          text: '所有待阅读全文',
          articleStatus: 2
        },
        {
          text: '所有重要文章',
          articleStatus: 3
        }
      ]
    },
    {
      text: '按期刊分类',
      nodes: []
    }
  ];

  const briefVm = new Vue({
    el: '#brief',
    data: {
      title: '',
      items: []
    },
    methods: {}
  });

  const articleVm = new Vue({
    el: '#article',
    data: {
      article: {},
      editing: false
    },
    methods: {
      changeStatus(status) {
        const that = this;
        $.post({
          url: '/api/status',
          data: {
            arnumber: that.article.entry_number,
            status: status
          }
        }).done(() => {
          that.article.status = status;
          briefVm.items.forEach((item) => {
            if (item.entry_number === that.article.entry_number) {
              item.status = status;
            }
          });
        });

        if (status === 2) {
          $.post({
            url: '/api/download',
            data: {
              arnumber: that.article.entry_number
            }
          }).done(() => {
            that.article.downloaded = true;
          });
        }

      },

      edit() {
        this.editing = true;
      },

      save() {
        const that = this;
        const $note = $('#article-note');
        $.post({
          url: '/api/note',
          data: {
            arnumber: that.article.entry_number,
            note: $note.val()
          }
        }).done(() => {
          this.article.note = $note.val();
          this.editing = false;
        });
      }
    }
  });

  briefVm.getDetail = async function (item) {
    if (item.status === 0) {
      $.post({
        url: '/api/status',
        data: {
          arnumber: item.entry_number,
          status: 1
        }
      }).done(() => {
        item.status = 1;
      });
    }
    articleVm.article = (await $.get({
      url: '/api/article',
      data: {
        arnumber: item.entry_number
      }
    })).data;
    articleVm.editing = false;
  };

// Obtain information of journals and issues
  const journals = (await $.get({
      url: '/api/journals'
    })
  ).data;
  let issues = [];

  for (let i = 0; i < journals.length; i++) {
    treeData[1].nodes.push({
      text: journals[i].name,
      nodes: []
    });
    issues.push((await $.get({
          url: 'api/issues',
          data: {
            punumber: journals[i].entry_number
          }
        })
      ).data
    )
    ;

    for (let j = 0; j < issues[i].length; j++) {
      if (issues[i][j].status === 0) {
        treeData[1].nodes[i].nodes.push({
          text: 'Early Access',
          issueNumber: issues[i][j].entry_number
        });
      } else {
        treeData[1].nodes[i].nodes.push({
          text: issues[i][j].year + ' Issue ' + issues[i][j].number,
          issueNumber: issues[i][j].entry_number
        });
      }
    }
  }

  $tree.treeview({
    data: treeData,
    levels: 3,
    showBorder: false
  });

// treeview event: selected
  $tree.on('nodeSelected', async(event, data) => {
    if ('articleStatus' in data) {
      briefVm.items = (await $.get({
        url: '/api/all',
        data: {
          status: data.articleStatus
        }
      })).data;
      briefVm.title = briefVm.items.length + ' articles';
    } else if ('issueNumber' in data) {
      briefVm.items = (await $.get({
        url: '/api/brief',
        data: {
          isnumber: data.issueNumber
        }
      })).data;
      briefVm.title = briefVm.items.length + ' articles in ' + data.text +
        ', ' + $tree.treeview('getNode', data.parentId).text;
    }
  });
})
;
