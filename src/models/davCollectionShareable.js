/**
 * CDAV Library
 *
 * This library is part of the Nextcloud project
 *
 * @author Georg Ehrke
 * @copyright 2018 Georg Ehrke <oc.list@georgehrke.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU AFFERO GENERAL PUBLIC LICENSE for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this library.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
import * as NS from '../utility/namespaceUtility.js';
import * as XMLUtility from '../utility/xmlUtility.js';

import { debugFactory } from '../debug.js';
const debug = debugFactory('DavCollectionShareable');

export function davCollectionShareable(Base) {
	return class extends Base {

		/**
		 * @inheritDoc
		 */
		constructor(...args) {
			super(...args);

			super._exposeProperty('shares', NS.OWNCLOUD, 'invite');
			super._exposeProperty('allowedSharingModes', NS.CALENDARSERVER, 'allowed-sharing-modes');
		}

		/**
		 * shares a DavCollection
		 *
		 * @param {String} principalScheme
		 * @param {boolean} writeable
		 * @param {string} summary
		 * @returns {Promise<void>}
		 */
		async share(principalScheme, writeable = false, summary = '') {
			debug(`Sharing ${this.url} with ${principalScheme}`);
			const [skeleton, setProp] = XMLUtility.getRootSkeleton(
				[NS.OWNCLOUD, 'share'], [NS.OWNCLOUD, 'set']);

			setProp.push({
				name: [NS.DAV, 'href'],
				value: principalScheme
			});

			if (writeable) {
				setProp.push({
					name: [NS.OWNCLOUD, 'read-write']
				});
			}
			if (summary !== '') {
				setProp.push({
					name: [NS.OWNCLOUD, 'summary'],
					value: summary
				});
			}

			const xml = XMLUtility.serialize(skeleton);
			return this._request.post(this._url, { 'Content-Type': 'application/xml; charset=utf-8' }, xml).then(() => {
				const index = this.shares.findIndex((e) => e.href === principalScheme);

				if (index === -1) {
					this.shares.push({
						href: principalScheme,
						access: [writeable ? '{http://owncloud.org/ns}read-write' : '{http://owncloud.org/ns}read'],
						'common-name': null,
						'invite-accepted': true
					});
				} else {
					this.shares[index].access
						= [writeable ? '{http://owncloud.org/ns}read-write' : '{http://owncloud.org/ns}read'];
				}
			});
		}

		/**
		 * unshares a DAVCollection
		 *
		 * @param {string} principalScheme
		 * @returns {Promise<void>}
		 */
		async unshare(principalScheme) {
			debug(`Unsharing ${this.url} with ${principalScheme}`);

			const [skeleton, oSetChildren] = XMLUtility.getRootSkeleton(
				[NS.OWNCLOUD, 'share'], [NS.OWNCLOUD, 'remove']);

			oSetChildren.push({
				name: [NS.DAV, 'href'],
				value: principalScheme
			});

			const xml = XMLUtility.serialize(skeleton);
			return this._request.post(this._url, { 'Content-Type': 'application/xml; charset=utf-8' }, xml).then(() => {
				const index = this.shares.findIndex((e) => e.href === principalScheme);
				if (index === -1) {
					return;
				}

				this.shares.splice(index, 1);
			});
		}

		/**
		 * checks whether a collection is shareable
		 *
		 * @returns {Boolean}
		 */
		isShareable() {
			if (!Array.isArray(this.allowedSharingModes)) {
				return false;
			}

			return this.allowedSharingModes.includes(`{${NS.CALENDARSERVER}}can-be-shared`);
		}

		/**
		 * checks whether a collection is publishable
		 *
		 * @returns {Boolean}
		 */
		isPublishable() {
			if (!Array.isArray(this.allowedSharingModes)) {
				return false;
			}

			return this.allowedSharingModes.includes(`{${NS.CALENDARSERVER}}can-be-published`);
		}

		/**
		 * @inheritDoc
		 */
		static getPropFindList() {
			return super.getPropFindList().concat([
				[NS.OWNCLOUD, 'invite'],
				[NS.CALENDARSERVER, 'allowed-sharing-modes']
			]);
		}

	};
}
