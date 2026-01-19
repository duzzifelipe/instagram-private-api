import { Expose } from 'class-transformer';
import { Feed } from '../core/feed';
import { UserFeedResponse, UserFeedResponseItemsItem } from '../responses';

export class UserFeed extends Feed<UserFeedResponse, UserFeedResponseItemsItem> {
  username: string;
  pageSize = 12;

  @Expose()
  private nextMaxId: string;

  protected set state(body: UserFeedResponse) {
    this.moreAvailable = body.more_available;
    this.nextMaxId = body.next_max_id;
  }

  async request() {
    const payload = {
      url: '/graphql/query',
      method: 'POST',
      qs: {
        locale: this.client.state.language,
      },
      form: {
        access_token: '',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'PolarisProfilePostsTabContentQuery_connection',
        doc_id: '25225277230478352',
        variables: JSON.stringify({
          after: this.nextMaxId,
          before: null,
          data: {
            count: this.pageSize,
            include_reel_media_seen_timestamp: true,
            include_relationship_info: true,
            latest_besties_reel_media: true,
            latest_reel_media: true,
          },
          first: this.pageSize,
          last: null,
          username: this.username,
        }),
      },
    };

    const { body } = await this.client.request.send(payload, true);

    if (body.status !== 'ok') {
      throw new Error(`UserFeed request failed with status: ${body.status}`);
    }

    if (body.errors) {
      throw new Error(`UserFeed request failed with errors: ${JSON.stringify(body.errors)}`);
    }

    console.log(body);

    const pageInfo = body.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info;
    const items = body.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.map(edge => edge.node);

    const response: UserFeedResponse = {
      items,
      num_results: items.length,
      more_available: pageInfo.has_next_page,
      next_max_id: pageInfo.end_cursor,
      auto_load_more_enabled: true,
      status: body.status,
    };

    this.state = response;

    return response;
  }

  async items() {
    const body = await this.request();
    return body.items;
  }
}
