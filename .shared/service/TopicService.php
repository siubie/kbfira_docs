<?php

class TopicService extends CoreService {

  function getTopicList() {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->select();
    return $db->query($qb->get());
  }

  function getTopicListOfGroup($gids = []) {
    if (count($gids) == 0) return [];
    $quote = function($v) {
      return "'" . QB::esc($v) . "'";
    };
    $db = self::instance('kbv2');
    $qb = QB::instance('topic t')->select()
      ->leftJoin('grup_topic gt', 'gt.tid', 't.tid')
      ->where('gt.gid', QB::IN, QB::raw(QB::OG . implode(",", array_map($quote, $gids)) . QB::EG));
    return $db->query($qb->get());
  }

  function insertTopic($tid, $title, $enabled = 1, $text = null, $data = null) {
    $db = self::instance('kbv2');
    $insert['tid']     = QB::esc($tid);
    $insert['title']   = QB::esc($title);
    $insert['enabled'] = QB::esc($enabled);
    $insert['text']    = QB::esc($text);
    $insert['data']    = QB::esc($data);
    $qb = QB::instance('topic')->insert($insert);
    $db->query($qb->get());
    return $this->selectTopic($tid);
  }

  function updateTopic($tid, $ntid, $title, $enabled = 1, $text = null, $data = null) {
    $db = self::instance('kbv2');
    $update['tid']     = QB::esc($ntid);
    $update['title']   = QB::esc($title);
    $update['enabled'] = QB::esc($enabled);
    $update['text']    = QB::esc($text);
    $update['data']    = QB::esc($data);
    $qb = QB::instance('topic')->update($update)->where('tid', $tid);
    $db->query($qb->get());
    return $this->selectTopic($ntid);
  }

  function selectTopic($tid) {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->select()
      ->where('tid', QB::esc($tid));
    return $db->getRow($qb->get());
  }

  function getTopics($keyword = '', $page = 1, $perpage = 10) {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->select()
      ->where('title', 'LIKE', "%$keyword%")
      ->orderBy('created', QB::DESC)
      ->limit(($page-1)*$perpage, $perpage);
    return $db->query($qb->get());
  }

  function getTopicsCount($keyword = '') {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->select(QB::raw('COUNT(*) AS count'))
      ->where('title', 'LIKE', "%$keyword%")
      ->orderBy('created', QB::DESC);
    return $db->getVar($qb->get());
  }

  function deleteTopic($tid) {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->delete()
      ->where('tid', QB::esc($tid));
    return $db->query($qb->get());
  }

  function assignTextToTopic($text, $tid) {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->update(['text' => $text])
      ->where('tid', QB::esc($tid));
    return $db->query($qb->get());
  }

  function unassignTextFromTopic($tid) {
    $db = self::instance('kbv2');
    $qb = QB::instance('topic')->update(['text' => null])
      ->where('tid', QB::esc($tid));
    return $db->query($qb->get());
  }

}